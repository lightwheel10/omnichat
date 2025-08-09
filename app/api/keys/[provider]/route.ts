import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encryptStringServer, decryptStringServer } from '@/lib/server/encryption'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

// Simple cookie-based storage for demo/prototype.
// For production, replace with Supabase/Postgres table keyed by user id + provider and RLS.

const COOKIE_PREFIX = 'oc_key_' // omnichat
const PROVIDERS = new Set(['openai', 'gemini', 'groq', 'claude'])

function getServerSecret(): string {
  const secret = process.env.SERVER_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('SERVER_ENCRYPTION_SECRET not set')
  }
  return secret
}

function cookieNameFor(provider: string): string {
  return `${COOKIE_PREFIX}${provider}`
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 })
  }
  const c = await cookies()
  const ck = c.get(cookieNameFor(provider))
  let hasDbKey = false
  if (supabaseAdmin) {
    const userId = c.get('sb:token')?.value ? (await (await import('next/headers')).headers()).get('x-client-info') : null
    // Fallback to anon cookie presence; actual user id retrieval should use auth context on your setup
    const authHeader = request.headers.get('authorization')
    const uid = request.headers.get('x-user-id') || ''
    if (uid) {
      const { data } = await supabaseAdmin.from('user_api_keys').select('provider').eq('user_id', uid).eq('provider', provider).maybeSingle()
      hasDbKey = !!data
    }
  }
  return NextResponse.json({ ok: true, hasKey: !!ck || hasDbKey })
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 })
  }
  const c = await cookies()
  c.set(cookieNameFor(provider), '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 })
  if (supabaseAdmin) {
    const uid = request.headers.get('x-user-id') || ''
    if (uid) {
      await supabaseAdmin.from('user_api_keys').delete().eq('user_id', uid).eq('provider', provider)
    }
  }
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body.apiKey !== 'string' || body.apiKey.trim() === '') {
    return NextResponse.json({ ok: false, error: 'missing apiKey' }, { status: 400 })
  }
  const secret = getServerSecret()
  const payload = encryptStringServer(body.apiKey.trim(), secret)
  const c = await cookies()
  c.set(cookieNameFor(provider), JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  // Persist encrypted blob in Supabase for multi-device availability
  if (supabaseAdmin) {
    const uid = request.headers.get('x-user-id') || ''
    if (uid) {
      await supabaseAdmin.from('user_api_keys').upsert({
        user_id: uid,
        provider,
        iv: payload.iv,
        ciphertext: payload.ciphertext,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' })
    }
  }
  return NextResponse.json({ ok: true })
}


