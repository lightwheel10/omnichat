import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

export interface ServerEncryptedPayload {
  iv: string // base64
  ciphertext: string // base64
}

function base64Encode(buf: Buffer): string {
  return buf.toString('base64')
}

function base64Decode(b64: string): Buffer {
  return Buffer.from(b64, 'base64')
}

function deriveAesKeyFromSecret(secret: string): Buffer {
  // Deterministic 32-byte key derived from server secret via SHA-256
  return createHash('sha256').update(secret, 'utf8').digest()
}

export function encryptStringServer(plaintext: string, secret: string): ServerEncryptedPayload {
  const key = deriveAesKeyFromSecret(secret)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([enc, tag])
  return {
    iv: base64Encode(iv),
    ciphertext: base64Encode(payload),
  }
}

export function decryptStringServer(payload: ServerEncryptedPayload, secret: string): string {
  const key = deriveAesKeyFromSecret(secret)
  const iv = base64Decode(payload.iv)
  const data = base64Decode(payload.ciphertext)
  const enc = data.subarray(0, data.length - 16)
  const tag = data.subarray(data.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}


