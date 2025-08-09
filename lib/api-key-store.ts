import {
  deriveAesGcmKeyFromPassphrase,
  decryptStringAesGcm,
  encryptStringAesGcm,
  type EncryptedPayload,
  uint8ToBase64,
  generateRandomBytes,
} from './crypto'

const OPENAI_API_KEY_STORAGE_KEY = 'ai-workbench-openai-api-key'
const GEMINI_API_KEY_STORAGE_KEY = 'ai-workbench-gemini-api-key'
const GROQ_API_KEY_STORAGE_KEY = 'ai-workbench-groq-api-key'
const CLAUDE_API_KEY_STORAGE_KEY = 'ai-workbench-claude-api-key'

// Keystore metadata + constants
const KEYSTORE_META_KEY = 'ai-workbench-keystore-meta-v1'
const LEGACY_XOR_KEY = 'ai-workbench-encryption-key'

type Provider = 'openai' | 'gemini' | 'groq' | 'claude'

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
  // New, optional hardening API
  isPassphraseConfigured?: () => boolean
  isLocked?: () => boolean
  setPassphrase?: (passphrase: string) => Promise<void>
  lock?: () => void
  exportKeystore?: () => Promise<string>
  importKeystore?: (json: string) => Promise<void>
  unlock?: (passphrase: string) => Promise<boolean>
}

interface KeystoreMetaV1 {
  version: 1
  salt: string // base64
  iterations: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readMeta(): KeystoreMetaV1 | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(KEYSTORE_META_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 1 && typeof parsed.salt === 'string') {
      return parsed as KeystoreMetaV1
    }
  } catch {
    // ignore
  }
  return null
}

function writeMeta(meta: KeystoreMetaV1): void {
  if (!isBrowser()) return
  localStorage.setItem(KEYSTORE_META_KEY, JSON.stringify(meta))
}

class SecureApiKeyStore implements ApiKeyStore {
  private derivedKey: CryptoKey | null = null
  private kdfIterations = 210_000

  // Legacy XOR helpers to migrate old values if present
  private getLegacyXorKey(): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(LEGACY_XOR_KEY)
  }

  private legacySimpleEncrypt(text: string, key: string): string {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result)
  }

  private legacySimpleDecrypt(encryptedText: string, key: string): string {
    try {
      const text = atob(encryptedText)
      let result = ''
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return result
    } catch {
      return ''
    }
  }

  isPassphraseConfigured(): boolean {
    return readMeta() !== null
  }

  isLocked(): boolean {
    const configured = this.isPassphraseConfigured()
    if (!configured) return false // not configured → no lock state
    return this.derivedKey === null
  }

  async setPassphrase(passphrase: string): Promise<void> {
    if (!isBrowser()) return
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters')
    }
    let meta = readMeta()
    if (!meta) {
      const salt = uint8ToBase64(generateRandomBytes(16))
      meta = { version: 1, salt, iterations: this.kdfIterations }
      writeMeta(meta)
    }
    this.derivedKey = await deriveAesGcmKeyFromPassphrase(passphrase, meta.salt, meta.iterations)
    await this.migrateLegacyValuesIfNeeded()
    await this.hydrateCacheFromStorage()
  }

  lock(): void {
    this.derivedKey = null
    // Clear plaintext caches when locking
    if (isBrowser()) {
      const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
      for (const p of providers) {
        const storageKey = this.providerKeyToStorageKey(p)
        sessionStorage.removeItem(`${storageKey}-cache`)
      }
    }
  }

  async unlock(passphrase: string): Promise<boolean> {
    if (!isBrowser()) return false
    const meta = readMeta()
    // If not configured yet, setting passphrase initializes meta
    if (!meta) {
      await this.setPassphrase(passphrase)
      return true
    }
    // Derive a candidate key and verify by decrypting any AES entries present
    const candidate = await deriveAesGcmKeyFromPassphrase(passphrase, meta.salt, meta.iterations)
    const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
    let sawEncrypted = false
    for (const p of providers) {
      const stored = localStorage.getItem(this.providerKeyToStorageKey(p))
      if (stored && stored.startsWith('{')) {
        sawEncrypted = true
        try {
          const obj = JSON.parse(stored) as any
          await decryptStringAesGcm({ iv: obj.iv, ciphertext: obj.ciphertext }, candidate)
        } catch {
          return false
        }
      }
    }
    // If no encrypted entries yet, accept the passphrase
    this.derivedKey = candidate
    await this.hydrateCacheFromStorage()
    return true
  }

  private providerKeyToStorageKey(provider: Provider): string {
    switch (provider) {
      case 'openai': return OPENAI_API_KEY_STORAGE_KEY
      case 'gemini': return GEMINI_API_KEY_STORAGE_KEY
      case 'groq': return GROQ_API_KEY_STORAGE_KEY
      case 'claude': return CLAUDE_API_KEY_STORAGE_KEY
    }
  }

  private async encryptForStorage(plaintext: string): Promise<string> {
    // If passphrase configured, require derivedKey
    const meta = readMeta()
    if (meta) {
      if (!this.derivedKey) {
        // Keystore is locked; refuse to store
        return ''
      }
      const payload = await encryptStringAesGcm(plaintext, this.derivedKey)
      return JSON.stringify({ v: 1, ...payload })
    }
    // Fallback to legacy XOR for users who haven’t configured passphrase yet
    const legacyKey = this.getLegacyXorKey() || this.generateAndPersistLegacyKey()
    return this.legacySimpleEncrypt(plaintext, legacyKey)
  }

  private async decryptFromStorage(stored: string | null): Promise<string | null> {
    if (!stored) return null
    // Detect AES-GCM payload
    if (stored.startsWith('{')) {
      try {
        const obj = JSON.parse(stored) as any
        if (obj && obj.v === 1 && typeof obj.iv === 'string' && typeof obj.ciphertext === 'string') {
          if (!this.derivedKey) return null // locked
          return await decryptStringAesGcm({ iv: obj.iv, ciphertext: obj.ciphertext }, this.derivedKey)
        }
      } catch {
        // fall through to legacy
      }
    }
    // Legacy XOR path
    const legacyKey = this.getLegacyXorKey()
    if (!legacyKey) return null
    const out = this.legacySimpleDecrypt(stored, legacyKey)
    return out || null
  }

  private generateAndPersistLegacyKey(): string {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(LEGACY_XOR_KEY, hex)
    return hex
  }

  private async setProviderKey(provider: Provider, value: string): Promise<void> {
    if (!isBrowser()) return
    const key = value.trim()
    if (!key) {
      this.clearProviderKey(provider)
      return
    }
    const encrypted = await this.encryptForStorage(key)
    if (!encrypted) return // locked
    localStorage.setItem(this.providerKeyToStorageKey(provider), encrypted)
    sessionStorage.setItem(`${this.providerKeyToStorageKey(provider)}-cache`, key)
  }

  private getProviderKey(provider: Provider): string | null {
    if (!isBrowser()) return null
    const stored = localStorage.getItem(this.providerKeyToStorageKey(provider))
    // sync decrypt requires async; expose sync API by peeking format
    // If AES and locked, return null; if legacy or AES+unlocked, try to decrypt synchronously via blocking async wrapper
    // We cannot block; so we preclude AES decryption here. To maintain API, we keep a synchronous path:
    // - If AES: return special marker to trigger async fallback in callers is impractical. Instead, we read cached plaintext kept in sessionStorage after successful decryption.
    // Implement a small cache: when we decrypt once (e.g., during Settings load), we store plaintext in sessionStorage; here we read it.
    const cacheKey = `${this.providerKeyToStorageKey(provider)}-cache`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return cached
    // If stored looks like legacy or keystore not configured, attempt legacy decrypt synchronously
    const meta = readMeta()
    if (!meta || (stored && !stored.startsWith('{'))) {
      const legacyKey = this.getLegacyXorKey()
      if (!legacyKey || !stored) return null
      const out = this.legacySimpleDecrypt(stored, legacyKey)
      return out || null
    }
    // AES path but no cache or locked
    return null
  }

  private async getProviderKeyAsync(provider: Provider): Promise<string | null> {
    if (!isBrowser()) return null
    const stored = localStorage.getItem(this.providerKeyToStorageKey(provider))
    const val = await this.decryptFromStorage(stored)
    if (val) {
      sessionStorage.setItem(`${this.providerKeyToStorageKey(provider)}-cache`, val)
    }
    return val
  }

  private clearProviderKey(provider: Provider): void {
    if (!isBrowser()) return
    localStorage.removeItem(this.providerKeyToStorageKey(provider))
    sessionStorage.removeItem(`${this.providerKeyToStorageKey(provider)}-cache`)
  }

  private async migrateLegacyValuesIfNeeded(): Promise<void> {
    if (!isBrowser()) return
    const meta = readMeta()
    if (!meta || !this.derivedKey) return
    const legacyKey = this.getLegacyXorKey()
    if (!legacyKey) return
    const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
    for (const p of providers) {
      const storageKey = this.providerKeyToStorageKey(p)
      const stored = localStorage.getItem(storageKey)
      if (stored && !stored.startsWith('{')) {
        const plain = this.legacySimpleDecrypt(stored, legacyKey)
        if (plain) {
          const encrypted = await encryptStringAesGcm(plain, this.derivedKey)
          localStorage.setItem(storageKey, JSON.stringify({ v: 1, ...encrypted }))
          sessionStorage.setItem(`${storageKey}-cache`, plain)
        }
      }
    }
  }

  private async hydrateCacheFromStorage(): Promise<void> {
    if (!isBrowser()) return
    if (!this.derivedKey) return
    const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
    for (const p of providers) {
      const storageKey = this.providerKeyToStorageKey(p)
      const stored = localStorage.getItem(storageKey)
      if (stored && stored.startsWith('{')) {
        try {
          const obj = JSON.parse(stored) as any
          const plaintext = await decryptStringAesGcm({ iv: obj.iv, ciphertext: obj.ciphertext }, this.derivedKey)
          if (plaintext) {
            sessionStorage.setItem(`${storageKey}-cache`, plaintext)
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Public API: OpenAI
  setApiKey(key: string): void {
    // Fire-and-forget; best-effort async
    void this.setProviderKey('openai', key)
  }

  getApiKey(): string | null { return this.getProviderKey('openai') }
  clearApiKey(): void { this.clearProviderKey('openai') }
  hasApiKey(): boolean { return !!this.getApiKey() && !this.isLocked() }

  // Gemini
  setGeminiApiKey(key: string): void { void this.setProviderKey('gemini', key) }
  getGeminiApiKey(): string | null { return this.getProviderKey('gemini') }
  clearGeminiApiKey(): void { this.clearProviderKey('gemini') }
  hasGeminiApiKey(): boolean { return !!this.getGeminiApiKey() && !this.isLocked() }

  // Groq
  setGroqApiKey(key: string): void { void this.setProviderKey('groq', key) }
  getGroqApiKey(): string | null { return this.getProviderKey('groq') }
  clearGroqApiKey(): void { this.clearProviderKey('groq') }
  hasGroqApiKey(): boolean { return !!this.getGroqApiKey() && !this.isLocked() }

  // Claude
  setClaudeApiKey(key: string): void { void this.setProviderKey('claude', key) }
  getClaudeApiKey(): string | null { return this.getProviderKey('claude') }
  clearClaudeApiKey(): void { this.clearProviderKey('claude') }
  hasClaudeApiKey(): boolean { return !!this.getClaudeApiKey() && !this.isLocked() }

  // Optional backup/export (only when passphrase configured)
  async exportKeystore(): Promise<string> {
    if (!isBrowser()) return '{}'
    const meta = readMeta()
    if (!meta) {
      throw new Error('Configure a passphrase before exporting the keystore')
    }
    const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
    const data: Record<string, EncryptedPayload | null> = {}
    for (const p of providers) {
      const stored = localStorage.getItem(this.providerKeyToStorageKey(p))
      if (stored && stored.startsWith('{')) {
        const obj = JSON.parse(stored)
        data[p] = { iv: obj.iv, ciphertext: obj.ciphertext }
      } else {
        data[p] = null
      }
    }
    return JSON.stringify({ version: 1, meta, data })
  }

  async importKeystore(json: string): Promise<void> {
    if (!isBrowser()) return
    const parsed = JSON.parse(json)
    if (!parsed || parsed.version !== 1 || !parsed.meta || !parsed.data) {
      throw new Error('Invalid keystore file')
    }
    writeMeta(parsed.meta as KeystoreMetaV1)
    const data = parsed.data as Record<string, EncryptedPayload | null>
    const providers: Provider[] = ['openai', 'gemini', 'groq', 'claude']
    for (const p of providers) {
      const payload = data[p]
      const storageKey = this.providerKeyToStorageKey(p)
      if (payload) {
        localStorage.setItem(storageKey, JSON.stringify({ v: 1, ...payload }))
        sessionStorage.removeItem(`${storageKey}-cache`)
      } else {
        localStorage.removeItem(storageKey)
        sessionStorage.removeItem(`${storageKey}-cache`)
      }
    }
  }
}

export const apiKeyStore = new SecureApiKeyStore()