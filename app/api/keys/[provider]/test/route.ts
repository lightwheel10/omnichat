import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Groq from 'groq-sdk'

const PROVIDERS = new Set(['openai', 'gemini', 'groq', 'claude'])

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body.apiKey !== 'string' || body.apiKey.trim() === '') {
    return NextResponse.json({ ok: false, error: 'missing apiKey' }, { status: 400 })
  }
  const apiKey = body.apiKey.trim()
  try {
    if (provider === 'openai') {
      const client = new OpenAI({ apiKey })
      // A lightweight call to list models validates the key without generating content
      await client.models.list()
      return NextResponse.json({ ok: true })
    }
    if (provider === 'groq') {
      const client = new Groq({ apiKey })
      await (client as any).models.list()
      return NextResponse.json({ ok: true })
    }
    if (provider === 'gemini') {
      const res = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + encodeURIComponent(apiKey))
      return NextResponse.json({ ok: res.ok })
    }
    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      })
      return NextResponse.json({ ok: res.ok })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error)?.message || 'validation failed' }, { status: 200 })
  }
  return NextResponse.json({ ok: false })
}


