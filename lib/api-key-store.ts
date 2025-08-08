const OPENAI_API_KEY_STORAGE_KEY = 'ai-workbench-openai-api-key'
const GEMINI_API_KEY_STORAGE_KEY = 'ai-workbench-gemini-api-key'
const GROQ_API_KEY_STORAGE_KEY = 'ai-workbench-groq-api-key'
const CLAUDE_API_KEY_STORAGE_KEY = 'ai-workbench-claude-api-key'

export interface ApiKeyStore {
  setApiKey: (key: string) => void
  getApiKey: () => string | null
  clearApiKey: () => void
  hasApiKey: () => boolean
  setGeminiApiKey: (key: string) => void
  getGeminiApiKey: () => string | null
  clearGeminiApiKey: () => void
  hasGeminiApiKey: () => boolean
  setGroqApiKey: (key: string) => void
  getGroqApiKey: () => string | null
  clearGroqApiKey: () => void
  hasGroqApiKey: () => boolean
  setClaudeApiKey: (key: string) => void
  getClaudeApiKey: () => string | null
  clearClaudeApiKey: () => void
  hasClaudeApiKey: () => boolean
}

class SecureApiKeyStore implements ApiKeyStore {
  private encryptionKey: string

  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey()
  }

  private getOrCreateEncryptionKey(): string {
    if (typeof window === 'undefined') return 'default-key'
    
    const key = localStorage.getItem('ai-workbench-encryption-key')
    if (key) return key
    
    const newKey = this.generateEncryptionKey()
    localStorage.setItem('ai-workbench-encryption-key', newKey)
    return newKey
  }

  private generateEncryptionKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private simpleEncrypt(text: string, key: string): string {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return btoa(result)
  }

  private simpleDecrypt(encryptedText: string, key: string): string {
    try {
      const text = atob(encryptedText)
      let result = ''
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      return result
    } catch {
      return ''
    }
  }

  setApiKey(key: string): void {
    if (typeof window === 'undefined') return
    
    if (!key || key.trim() === '') {
      this.clearApiKey()
      return
    }
    
    const encrypted = this.simpleEncrypt(key.trim(), this.encryptionKey)
    localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, encrypted)
  }

  getApiKey(): string | null {
    if (typeof window === 'undefined') return null
    
    const encrypted = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY)
    if (!encrypted) return null
    
    const decrypted = this.simpleDecrypt(encrypted, this.encryptionKey)
    return decrypted || null
  }

  clearApiKey(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY)
  }

  hasApiKey(): boolean {
    return this.getApiKey() !== null
  }

  setGeminiApiKey(key: string): void {
    if (typeof window === 'undefined') return
    
    if (!key || key.trim() === '') {
      this.clearGeminiApiKey()
      return
    }
    
    const encrypted = this.simpleEncrypt(key.trim(), this.encryptionKey)
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, encrypted)
  }

  getGeminiApiKey(): string | null {
    if (typeof window === 'undefined') return null
    
    const encrypted = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)
    if (!encrypted) return null
    
    const decrypted = this.simpleDecrypt(encrypted, this.encryptionKey)
    return decrypted || null
  }

  clearGeminiApiKey(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
  }

  hasGeminiApiKey(): boolean {
    return this.getGeminiApiKey() !== null
  }

  setGroqApiKey(key: string): void {
    if (typeof window === 'undefined') return
    
    if (!key || key.trim() === '') {
      this.clearGroqApiKey()
      return
    }
    
    const encrypted = this.simpleEncrypt(key.trim(), this.encryptionKey)
    localStorage.setItem(GROQ_API_KEY_STORAGE_KEY, encrypted)
  }

  getGroqApiKey(): string | null {
    if (typeof window === 'undefined') return null
    
    const encrypted = localStorage.getItem(GROQ_API_KEY_STORAGE_KEY)
    if (!encrypted) return null
    
    const decrypted = this.simpleDecrypt(encrypted, this.encryptionKey)
    return decrypted || null
  }

  clearGroqApiKey(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(GROQ_API_KEY_STORAGE_KEY)
  }

  hasGroqApiKey(): boolean {
    return this.getGroqApiKey() !== null
  }

  setClaudeApiKey(key: string): void {
    if (typeof window === 'undefined') return
    if (!key || key.trim() === '') {
      this.clearClaudeApiKey()
      return
    }
    const encrypted = this.simpleEncrypt(key.trim(), this.encryptionKey)
    localStorage.setItem(CLAUDE_API_KEY_STORAGE_KEY, encrypted)
  }

  getClaudeApiKey(): string | null {
    if (typeof window === 'undefined') return null
    const encrypted = localStorage.getItem(CLAUDE_API_KEY_STORAGE_KEY)
    if (!encrypted) return null
    const decrypted = this.simpleDecrypt(encrypted, this.encryptionKey)
    return decrypted || null
  }

  clearClaudeApiKey(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CLAUDE_API_KEY_STORAGE_KEY)
  }

  hasClaudeApiKey(): boolean {
    return this.getClaudeApiKey() !== null
  }
}

export const apiKeyStore = new SecureApiKeyStore()