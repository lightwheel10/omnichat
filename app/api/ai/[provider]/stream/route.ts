import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { decryptStringServer } from '@/lib/server/encryption'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

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
    if (supabaseAdmin) {
      try {
        const uid = (await import('next/headers')).headers().then(h => h.get('x-user-id')).catch(() => null) as any
        if (uid) {
          const { data } = await supabaseAdmin.from('user_api_keys').select('iv,ciphertext').eq('user_id', uid as any).eq('provider', provider).maybeSingle()
          if (data) return decryptStringServer({ iv: data.iv, ciphertext: data.ciphertext }, getServerSecret())
        }
      } catch {}
    }
    return null
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  const apiKey = await getProviderKey(provider)
  if (!apiKey) {
    return new Response('no api key', { status: 401 })
  }
  const body: any = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || typeof body.model !== 'string') {
    return new Response('invalid payload', { status: 400 })
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const stream: any = await client.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens,
      stream: true,
    })
    const encoder = new TextEncoder()
    const rs = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      }
    })
    return new Response(rs, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  if (provider === 'groq') {
    const client = new Groq({ apiKey })
    const stream = await client.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_completion_tokens: body.maxTokens,
      stream: true,
    })
    const encoder = new TextEncoder()
    const rs = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      }
    })
    return new Response(rs, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  // Minimal SSE proxies for others can be added similarly
  return new Response('unsupported', { status: 400 })
}


