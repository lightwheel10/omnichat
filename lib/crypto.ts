// Lightweight WebCrypto helpers for AES-GCM encryption with PBKDF2 key derivation
// Notes:
// - Uses PBKDF2(SHA-256) with high iteration count to derive a 256-bit AES-GCM key from a passphrase
// - Encodes binary data using base64 for storage/transit

const TEXT_ENCODER = new TextEncoder()
const TEXT_DECODER = new TextDecoder()

export interface EncryptedPayload {
  iv: string // base64
  ciphertext: string // base64
}

function toBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any)
  }
  return btoa(binary)
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return array
}

export function uint8ToBase64(bytes: Uint8Array): string {
  return toBase64(bytes.buffer)
}

export function base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(fromBase64(b64))
}

export async function deriveAesGcmKeyFromPassphrase(
  passphrase: string,
  saltBase64: string,
  iterations: number = 210_000
): Promise<CryptoKey> {
  const salt = base64ToUint8(saltBase64)
  const rawKey = await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptStringAesGcm(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = generateRandomBytes(12) // 96-bit IV recommended for AES-GCM
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    TEXT_ENCODER.encode(plaintext)
  )
  return {
    iv: uint8ToBase64(iv),
    ciphertext: toBase64(cipher),
  }
}

export async function decryptStringAesGcm(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = base64ToUint8(payload.iv)
  const cipherBuf = fromBase64(payload.ciphertext)
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuf
  )
  return TEXT_DECODER.decode(plainBuf)
}

export async function encryptJsonAesGcm<T>(data: T, key: CryptoKey): Promise<EncryptedPayload> {
  const plaintext = JSON.stringify(data)
  return await encryptStringAesGcm(plaintext, key)
}

export async function decryptJsonAesGcm<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const plaintext = await decryptStringAesGcm(payload, key)
  return JSON.parse(plaintext) as T
}


