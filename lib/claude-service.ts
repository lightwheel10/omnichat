import { apiKeyStore } from './api-key-store'

export interface ClaudeModel {
  id: string
  name: string
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
}

export const AVAILABLE_CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1 (2025-08-05)',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.015, output: 0.075 },
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4 (2025-05-14)',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet (2025-02-19)',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku (2024-10-22)',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.0008, output: 0.004 },
  },
]

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  content: string
  model: string
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  cost: number
}

export interface StreamingChatResponse {
  stream: ReadableStream<string>
  model: string
}

class ClaudeService {
  private endpoint = 'https://api.anthropic.com/v1/messages'
  private apiVersion = '2023-06-01'

  private getApiKey(): string {
    const key = apiKeyStore.getClaudeApiKey()
    if (!key) {
      throw new Error('Claude API key not found. Please add your Claude API key in settings.')
    }
    return key
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = AVAILABLE_CLAUDE_MODELS.find(m => m.id === model)
    if (!modelInfo) return 0
    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output
    return inputCost + outputCost
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string = 'claude-sonnet-4',
    _temperature: number = 0.7,
    maxTokens: number = 1024
  ): Promise<ChatResponse> {
    const apiKey = this.getApiKey()

    const systemPrompts = messages
      .filter(m => m.role === 'system')
      .map(m => m.content.trim())
    const system = systemPrompts.length > 0 ? systemPrompts.join('\n\n') : undefined

    const converted = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: [{ type: 'text', text: m.content }],
      }))

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: converted,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Claude API error')
    }

    const data: any = await res.json()
    const contentText = (data?.content || [])
      .filter((c: any) => c?.type === 'text')
      .map((c: any) => c.text)
      .join('')

    const inputTokens = data?.usage?.input_tokens ?? 0
    const outputTokens = data?.usage?.output_tokens ?? Math.ceil(contentText.length / 4)
    const cost = this.calculateCost(model, inputTokens, outputTokens)

    return {
      content: contentText,
      model,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost,
    }
  }

  async sendMessageStream(
    messages: ChatMessage[],
    model: string = 'claude-sonnet-4',
    _temperature: number = 0.7,
    maxTokens: number = 1024
  ): Promise<StreamingChatResponse> {
    const apiKey = this.getApiKey()

    const systemPrompts = messages
      .filter(m => m.role === 'system')
      .map(m => m.content.trim())
    const system = systemPrompts.length > 0 ? systemPrompts.join('\n\n') : undefined

    const converted = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: [{ type: 'text', text: m.content }],
      }))

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': this.apiVersion,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: converted,
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      const text = await response.text()
      throw new Error(text || 'Claude streaming API error')
    }

    // Wrap SSE into a text ReadableStream of just deltas
    const reader = response.body.getReader()
    const textStream = new ReadableStream<string>({
      start(controller) {
        const decoder = new TextDecoder()
        let buffer = ''
        function pushChunk(chunk: Uint8Array) {
          buffer += decoder.decode(chunk, { stream: true })
          let index: number
          while ((index = buffer.indexOf('\n\n')) !== -1) {
            const eventBlock = buffer.slice(0, index)
            buffer = buffer.slice(index + 2)
            eventBlock.split('\n').forEach(line => {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) return
              const json = trimmed.slice(5).trim()
              if (json === '[DONE]') return
              try {
                const evt = JSON.parse(json)
                if (evt?.type === 'content_block_delta' && evt?.delta?.type === 'text_delta' && evt?.delta?.text) {
                  controller.enqueue(evt.delta.text as string)
                }
              } catch {
                // ignore parse errors
              }
            })
          }
        }
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) pushChunk(value)
            }
            controller.close()
          } catch (err) {
            controller.error(err)
          } finally {
            reader.releaseLock()
          }
        })()
      },
    })

    return { stream: textStream, model }
  }

  refreshClient(): void {
    // No client instance to refresh
  }

  hasValidApiKey(): boolean {
    return apiKeyStore.hasClaudeApiKey()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage(
        [{ role: 'user', content: 'Hello, please respond with just "OK"' }],
        'claude-3-5-haiku-20241022',
        0.2,
        5
      )
      return true
    } catch {
      return false
    }
  }
}

export const claudeService = new ClaudeService()

