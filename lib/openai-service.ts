import OpenAI from 'openai'
import { apiKeyStore } from './api-key-store'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenAIModel {
  id: string
  name: string
  description: string
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
}

export const AVAILABLE_MODELS: OpenAIModel[] = [
  // Latest flagship models (250k tokens/day limit)
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Flagship model for coding, reasoning, and agentic tasks (400k context, reasoning tokens)',
    maxTokens: 400000,
    // Pricing stored per 1K tokens internally (display converted to /1M in UI)
    costPer1kTokens: { input: 0.00125, output: 0.01 }
  },
  
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Advanced reasoning with improved performance',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.008, output: 0.024 }
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced model, best for complex reasoning',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.005, output: 0.015 }
  },
  
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'OpenAI small reasoning model (2025-04-16)',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.0011, output: 0.0044 }
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model for complex problems',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.015, output: 0.06 }
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    description: 'Small reasoning model (2025) with high intelligence at low cost',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.0011, output: 0.0044 }
  },
  
  // Efficient models (2.5M tokens/day limit)
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Fastest, most cost-efficient version of GPT-5 for summarization and classification',
    maxTokens: 400000,
    // $0.05 input /1M, $0.40 output /1M → per 1K
    costPer1kTokens: { input: 0.00005, output: 0.0004 }
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    description: 'Faster, cost-efficient version of GPT-5 for well-defined tasks',
    maxTokens: 400000,
    // $0.25 input /1M, $2.00 output /1M → per 1K
    costPer1kTokens: { input: 0.00025, output: 0.002 }
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Efficient version of GPT-4.1 for faster responses',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.0002, output: 0.0008 }
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Ultra-fast and lightweight for simple tasks',
    maxTokens: 64000,
    costPer1kTokens: { input: 0.0001, output: 0.0004 }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient, great for most tasks',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.00015, output: 0.0006 }
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Compact reasoning model for everyday problems',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.003, output: 0.012 }
  },
  
  
  // Legacy models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Previous generation flagship model',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.01, output: 0.03 }
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Cost-effective for simpler tasks',
    maxTokens: 16385,
    costPer1kTokens: { input: 0.0005, output: 0.0015 }
  }
]

export interface ChatResponse {
  content: string
  model: string
  tokensUsed: {
    input: number
    output: number
    total: number
    reasoning?: number
  }
  cost: number
  reasoningSummary?: string
}

export interface StreamingChatResponse {
  stream: ReadableStream<string>
  model: string
  usage?: Promise<{
    inputTokens: number
    outputTokens: number
    totalTokens: number
    reasoningTokens?: number
  } | null>
}

class OpenAIService {
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    const apiKey = apiKeyStore.getApiKey()
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add your API key in settings.')
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      })
    }

    return this.client
  }

  private isReasoningModel(modelId: string): boolean {
    return modelId.startsWith('o') || modelId.startsWith('gpt-5')
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === model)
    if (!modelInfo) return 0

    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output
    return inputCost + outputCost
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string = 'gpt-4o-mini',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<ChatResponse> {
    try {
      const client = this.getClient()

      // For reasoning models, use Responses API to fetch reasoning summaries and reliable usage
      if (this.isReasoningModel(model)) {
        const response: any = await (client as any).responses.create({
          model,
          input: messages.map(m => ({ role: m.role, content: m.content })),
          reasoning: { effort: 'medium', summary: 'auto' },
          ...(typeof maxTokens === 'number' ? { max_output_tokens: maxTokens } : {}),
        })

        const outputs = response.output || []
        const messageItem = outputs.find((o: any) => o.type === 'message')
        const content = (response.output_text) || (messageItem?.content?.[0]?.text ?? '')
        const reasoningItem = outputs.find((o: any) => o.type === 'reasoning')
        const reasoningSummary: string | undefined = reasoningItem?.summary?.[0]?.text

        const usage = response.usage || {}
        const inputTokens = usage.input_tokens ?? 0
        const outputTokens = usage.output_tokens ?? 0
        const totalTokens = usage.total_tokens ?? (inputTokens + outputTokens)
        const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0

        const cost = this.calculateCost(model, inputTokens, outputTokens)

        return {
          content,
          model,
          tokensUsed: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            reasoning: reasoningTokens,
          },
          cost,
          reasoningSummary,
        }
      }

      // Non‑reasoning models: use Chat Completions
      const request: any = {
        model,
        messages: messages.map(msg => ({ role: msg.role as any, content: msg.content })),
      }
      if (!this.isReasoningModel(model)) {
        request.temperature = temperature
      }
      if (typeof maxTokens === 'number') {
        request.max_tokens = maxTokens
      }
      const response = await client.chat.completions.create(request)

      const choice = response.choices[0]
      if (!choice?.message?.content) {
        throw new Error('No response content received from OpenAI')
      }

      const usage = response.usage as any
      const cost = usage 
        ? this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
        : 0

      return {
        content: choice.message.content,
        model,
        tokensUsed: {
          input: usage?.prompt_tokens || usage?.input_tokens || 0,
          output: usage?.completion_tokens || usage?.output_tokens || 0,
          total: usage?.total_tokens || 0,
          reasoning: usage?.completion_tokens_details?.reasoning_tokens || usage?.output_tokens_details?.reasoning_tokens || 0
        },
        cost
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your OpenAI account billing.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with OpenAI.')
    }
  }

  async sendMessageStream(
    messages: ChatMessage[],
    model: string = 'gpt-4o-mini',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<StreamingChatResponse> {
    try {
      const client = this.getClient()
      const request: any = {
        model,
        messages: messages.map(msg => ({ role: msg.role as any, content: msg.content })),
        stream: true,
      }
      // Do not send temperature to reasoning models
      if (!this.isReasoningModel(model)) {
        request.temperature = temperature
      }
      if (typeof maxTokens === 'number') {
        if (this.isReasoningModel(model)) {
          request.max_completion_tokens = maxTokens
        } else {
          request.max_tokens = maxTokens
        }
      }
      if (this.isReasoningModel(model)) {
        request.reasoning_effort = 'medium'
      }
      const stream: any = await client.chat.completions.create(request)

      let finalUsage: any = null
      let resolveUsage: (u: any) => void = () => {}
      const usage: Promise<{
        inputTokens: number
        outputTokens: number
        totalTokens: number
        reasoningTokens?: number
      } | null> = new Promise(resolve => { resolveUsage = (u) => {
        if (!u) { resolve(null); return }
        resolve({
          inputTokens: u.prompt_tokens ?? u.input_tokens ?? 0,
          outputTokens: u.completion_tokens ?? u.output_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
          reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? u.output_tokens_details?.reasoning_tokens ?? 0,
        })
      } })

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content
              // capture usage if provided in final chunk (not always available)
              if ((chunk as any).usage) {
                finalUsage = (chunk as any).usage
              }
              if (content) {
                controller.enqueue(content)
              }
            }
            resolveUsage(finalUsage)
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        }
      })

      return {
        stream: readableStream,
        model,
        // Expose usage promise for callers who want token details (if the API provides them)
        usage
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your OpenAI account billing.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with OpenAI.')
    }
  }

  refreshClient(): void {
    this.client = null
  }

  hasValidApiKey(): boolean {
    return apiKeyStore.hasApiKey()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage([
        { role: 'user', content: 'Hello, please respond with just "OK"' }
      ], 'gpt-4o-mini')
      return true
    } catch {
      return false
    }
  }
}

export const openaiService = new OpenAIService()