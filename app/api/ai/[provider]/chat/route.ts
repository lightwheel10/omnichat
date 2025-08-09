import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decryptStringServer } from '@/lib/server/encryption'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

const PROVIDERS = new Set(['openai', 'gemini', 'groq', 'claude'])

function getServerSecret(): string {
  const secret = process.env.SERVER_ENCRYPTION_SECRET
  if (!secret) throw new Error('SERVER_ENCRYPTION_SECRET not set')
  return secret
}

function cookieNameFor(provider: string): string {
  return `oc_key_${provider}`
}

async function getProviderKey(provider: string): Promise<string | null> {
  const c = await cookies()
  const ck = c.get(cookieNameFor(provider))
  if (!ck) return null
  try {
    const payload = JSON.parse(ck.value)
    return decryptStringServer(payload, getServerSecret())
  } catch {
    // Try DB fallback
    if (supabaseAdmin) {
      const uid = (await import('next/headers')).headers().then(h => h.get('x-user-id')).catch(() => null) as any
      if (uid) {
        try {
          const { data } = await supabaseAdmin.from('user_api_keys').select('iv,ciphertext').eq('user_id', uid as any).eq('provider', provider).maybeSingle()
          if (data) {
            return decryptStringServer({ iv: data.iv, ciphertext: data.ciphertext }, getServerSecret())
          }
        } catch {}
      }
    }
    // Fallback to server env keys (platform-managed)
    try {
      if (provider === 'openai' && process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
      if (provider === 'gemini' && process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
      if (provider === 'groq' && process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY
      if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
    } catch {}
    return null
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 })
  }
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || typeof body.model !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
  }
  const apiKey = await getProviderKey(provider)
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'no api key' }, { status: 401 })
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens,
    })
    const choice = response.choices[0]
    return NextResponse.json({ ok: true, content: choice.message?.content, usage: response.usage })
  }

  if (provider === 'groq') {
    const client = new Groq({ apiKey })
    const response = await client.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_completion_tokens: body.maxTokens,
    })
    const choice = response.choices[0]
    return NextResponse.json({ ok: true, content: choice.message?.content, usage: response.usage })
  }

  if (provider === 'gemini') {
    // Minimal Gemini proxy; for full fidelity use @google/genai server-side.
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: body.model, contents: body.messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) })
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ ok: false, error: text || 'gemini error' }, { status: 500 })
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('') || ''
    return NextResponse.json({ ok: true, content: text })
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.maxTokens ?? 1024,
        messages: body.messages.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: [{ type: 'text', text: m.content }] })),
      })
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ ok: false, error: text || 'claude error' }, { status: 500 })
    }
    const data = await res.json()
    const contentText = (data?.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('')
    return NextResponse.json({ ok: true, content: contentText, usage: data?.usage })
  }

  return NextResponse.json({ ok: false, error: 'unsupported provider' }, { status: 400 })
}


