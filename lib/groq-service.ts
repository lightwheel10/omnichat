import Groq from 'groq-sdk'
import { apiKeyStore } from './api-key-store'

export interface GroqModel {
  id: string
  name: string
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
}

export const AVAILABLE_GROQ_MODELS: GroqModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    maxTokens: 131072,
    costPer1kTokens: { input: 0.00059, output: 0.00079 }
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    maxTokens: 131072,
    costPer1kTokens: { input: 0.00005, output: 0.00008 }
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    maxTokens: 32768,
    costPer1kTokens: { input: 0.00059, output: 0.00079 }
  },
  {
    id: 'moonshotai/kimi-k2-instruct',
    name: 'Kimi K2 Instruct',
    maxTokens: 131072,
    costPer1kTokens: { input: 0.00015, output: 0.00060 }
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma2 9B IT',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.00020, output: 0.00020 }
  },
  {
    id: 'llama3-8b-8192',
    name: 'Llama3 8B',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.00005, output: 0.00008 }
  },
  {
    id: 'llama3-70b-8192',
    name: 'Llama3 70B',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.00059, output: 0.00079 }
  }
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

class GroqService {
  private client: Groq | null = null

  private getClient(): Groq {
    const apiKey = apiKeyStore.getGroqApiKey()
    if (!apiKey) {
      throw new Error('Groq API key not found. Please add your Groq API key in settings.')
    }

    if (!this.client) {
      this.client = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true
      })
    }

    return this.client
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = AVAILABLE_GROQ_MODELS.find(m => m.id === model)
    if (!modelInfo) return 0

    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output
    return inputCost + outputCost
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string = 'llama-3.1-8b-instant',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<ChatResponse> {
    try {
      const client = this.getClient()
      
      const response = await client.chat.completions.create({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_completion_tokens: maxTokens,
      })

      const choice = response.choices[0]
      if (!choice?.message?.content) {
        throw new Error('No response content received from Groq')
      }

      const usage = response.usage
      const cost = usage 
        ? this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
        : 0

      return {
        content: choice.message.content,
        model,
        tokensUsed: {
          input: usage?.prompt_tokens || 0,
          output: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0
        },
        cost
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your Groq API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your Groq account billing.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with Groq.')
    }
  }

  async sendMessageStream(
    messages: ChatMessage[],
    model: string = 'llama-3.1-8b-instant',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<StreamingChatResponse> {
    try {
      const client = this.getClient()
      
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      })

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content
              if (content) {
                controller.enqueue(content)
              }
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        }
      })

      return {
        stream: readableStream,
        model
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your Groq API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded. Please check your Groq account billing.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with Groq.')
    }
  }

  refreshClient(): void {
    this.client = null
  }

  hasValidApiKey(): boolean {
    return apiKeyStore.hasGroqApiKey()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage([
        { role: 'user', content: 'Hello, please respond with just "OK"' }
      ], 'llama-3.1-8b-instant')
      return true
    } catch {
      return false
    }
  }
}

export const groqService = new GroqService()