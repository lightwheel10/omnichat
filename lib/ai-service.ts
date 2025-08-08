import { openaiService, AVAILABLE_MODELS as OPENAI_MODELS, type ChatMessage, type ChatResponse } from './openai-service'
import { geminiService, AVAILABLE_GEMINI_MODELS } from './gemini-service'
import { groqService, AVAILABLE_GROQ_MODELS } from './groq-service'
import { claudeService, AVAILABLE_CLAUDE_MODELS } from './claude-service'

export interface UnifiedModel {
  id: string
  name: string
  provider: 'openai' | 'gemini' | 'groq' | 'claude'
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
}

export const AVAILABLE_MODELS: UnifiedModel[] = [
  ...OPENAI_MODELS.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'openai' as const,
    maxTokens: model.maxTokens,
    costPer1kTokens: model.costPer1kTokens
  })),
  ...AVAILABLE_GEMINI_MODELS.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'gemini' as const,
    maxTokens: model.maxTokens,
    costPer1kTokens: model.costPer1kTokens
  })),
  ...AVAILABLE_GROQ_MODELS.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'groq' as const,
    maxTokens: model.maxTokens,
    costPer1kTokens: model.costPer1kTokens
  })),
  ...AVAILABLE_CLAUDE_MODELS.map(model => ({
    id: model.id,
    name: model.name,
    provider: 'claude' as const,
    maxTokens: model.maxTokens,
    costPer1kTokens: model.costPer1kTokens
  })),
]

export { type ChatMessage, type ChatResponse }

class UnifiedAIService {
  async sendMessage(
    messages: ChatMessage[],
    model: string,
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<ChatResponse> {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === model)
    if (!modelInfo) {
      throw new Error(`Model ${model} not found`)
    }

    if (modelInfo.provider === 'openai') {
      return await openaiService.sendMessage(messages, model, temperature, maxTokens)
    } else if (modelInfo.provider === 'gemini') {
      return await geminiService.sendMessage(messages, model, temperature, maxTokens)
    } else if (modelInfo.provider === 'groq') {
      return await groqService.sendMessage(messages, model, temperature, maxTokens)
    } else {
      return await claudeService.sendMessage(messages, model, temperature, maxTokens)
    }
  }

  async sendMessageStream(
    messages: ChatMessage[],
    model: string,
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<{ stream: ReadableStream<string>, model: string }> {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === model)
    if (!modelInfo) {
      throw new Error(`Model ${model} not found`)
    }

    if (modelInfo.provider === 'openai') {
      return await openaiService.sendMessageStream(messages, model, temperature, maxTokens)
    } else if (modelInfo.provider === 'gemini') {
      return await geminiService.sendMessageStream(messages, model, temperature, maxTokens)
    } else if (modelInfo.provider === 'groq') {
      return await groqService.sendMessageStream(messages, model, temperature, maxTokens)
    } else {
      return await claudeService.sendMessageStream(messages, model, temperature, maxTokens)
    }
  }


  hasValidApiKey(provider?: 'openai' | 'gemini' | 'groq' | 'claude'): boolean {
    if (provider === 'openai') {
      return openaiService.hasValidApiKey()
    } else if (provider === 'gemini') {
      return geminiService.hasValidApiKey()
    } else if (provider === 'groq') {
      return groqService.hasValidApiKey()
    } else if (provider === 'claude') {
      return claudeService.hasValidApiKey()
    }
    return openaiService.hasValidApiKey() || geminiService.hasValidApiKey() || groqService.hasValidApiKey() || claudeService.hasValidApiKey()
  }

  async testConnection(provider: 'openai' | 'gemini' | 'groq' | 'claude'): Promise<boolean> {
    if (provider === 'openai') {
      return await openaiService.testConnection()
    } else if (provider === 'gemini') {
      return await geminiService.testConnection()
    } else if (provider === 'groq') {
      return await groqService.testConnection()
    } else {
      return await claudeService.testConnection()
    }
  }

  refreshClient(provider?: 'openai' | 'gemini' | 'groq' | 'claude'): void {
    if (!provider || provider === 'openai') {
      openaiService.refreshClient()
    }
    if (!provider || provider === 'gemini') {
      geminiService.refreshClient()
    }
    if (!provider || provider === 'groq') {
      groqService.refreshClient()
    }
    if (!provider || provider === 'claude') {
      claudeService.refreshClient()
    }
  }
}

export const aiService = new UnifiedAIService()