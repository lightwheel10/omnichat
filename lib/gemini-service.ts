import { GoogleGenAI } from '@google/genai'
import { apiKeyStore } from './api-key-store'

export interface GeminiModel {
  id: string
  name: string
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
}

export const AVAILABLE_GEMINI_MODELS: GeminiModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    maxTokens: 1048576,
    // Pricing per 1K (converted from $0.30 in /1M input, $2.50 in /1M output)
    costPer1kTokens: { input: 0.0003, output: 0.0025 }
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    maxTokens: 2097152,
    // Pricing per 1K (converted from $1.25 /1M input, $10 /1M output)
    costPer1kTokens: { input: 0.00125, output: 0.01 }
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    maxTokens: 1048576,
    // Pricing per 1K (converted from $0.075 /1M input, $0.30 /1M output)
    costPer1kTokens: { input: 0.000075, output: 0.0003 }
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    maxTokens: 2097152,
    costPer1kTokens: { input: 0.00125, output: 0.005 }
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

class GeminiService {
  private client: GoogleGenAI | null = null

  private getClient(): GoogleGenAI {
    const apiKey = apiKeyStore.getGeminiApiKey()
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please add your Gemini API key in settings.')
    }

    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey,
      })
    }

    return this.client
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = AVAILABLE_GEMINI_MODELS.find(m => m.id === model)
    if (!modelInfo) return 0

    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output
    return inputCost + outputCost
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string = 'gemini-1.5-flash',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<ChatResponse> {
    try {
      const client = this.getClient()
      
      // Convert messages to Gemini format
      const conversationHistory = messages.map(msg => {
        if (msg.role === 'system') {
          return { role: 'user', parts: [{ text: `System: ${msg.content}` }] }
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }
      })

      const response = await client.models.generateContent({
        model,
        contents: conversationHistory
      })

      if (!response.text) {
        throw new Error('No response content received from Gemini')
      }

      // Note: Gemini API doesn't always provide token usage information
      // These are estimates based on response length
      const estimatedInputTokens = messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
      const estimatedOutputTokens = Math.ceil(response.text.length / 4)
      const cost = this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens)

      return {
        content: response.text,
        model,
        tokensUsed: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
          total: estimatedInputTokens + estimatedOutputTokens
        },
        cost
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Gemini API key. Please check your Gemini API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('Gemini API quota exceeded. Please check your Google AI account.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with Gemini.')
    }
  }

  async sendMessageStream(
    messages: ChatMessage[],
    model: string = 'gemini-1.5-flash',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<StreamingChatResponse> {
    try {
      const client = this.getClient()
      
      // Convert messages to Gemini format
      const conversationHistory = messages.map(msg => {
        if (msg.role === 'system') {
          return { role: 'user', parts: [{ text: `System: ${msg.content}` }] }
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }
      })

      const response = await client.models.generateContentStream({
        model,
        contents: conversationHistory
      })

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response) {
              const text = chunk.text
              if (text) {
                controller.enqueue(text)
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
          throw new Error('Invalid Gemini API key. Please check your Gemini API key in settings.')
        }
        if (error.message.includes('quota')) {
          throw new Error('Gemini API quota exceeded. Please check your Google AI account.')
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw error
      }
      throw new Error('An unexpected error occurred while communicating with Gemini.')
    }
  }

  refreshClient(): void {
    this.client = null
  }

  hasValidApiKey(): boolean {
    return apiKeyStore.hasGeminiApiKey()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage([
        { role: 'user', content: 'Hello, please respond with just "OK"' }
      ], 'gemini-1.5-flash')
      return true
    } catch {
      return false
    }
  }
}

export const geminiService = new GeminiService()