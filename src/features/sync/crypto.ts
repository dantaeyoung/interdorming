export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
export function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len)
  crypto.getRandomValues(b)
  return b
}

const PBKDF2_ITERATIONS = 600_000

export interface DerivedKeys {
  encKey: CryptoKey // AES-256-GCM, non-extractable
  authProofHex: string // 32 bytes hex — sent to server
  workspaceId: string // SHA-256(authProof) hex — server lookup key
}

export async function deriveKeys(password: string, salt: Uint8Array): Promise<DerivedKeys> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    512, // 64 bytes
  )
  const material = new Uint8Array(bits)
  const encRaw = material.slice(0, 32)
  const authProof = material.slice(32, 64)
  const encKey = await crypto.subtle.importKey('raw', encRaw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
  const idDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', authProof))
  return { encKey, authProofHex: toHex(authProof), workspaceId: toHex(idDigest) }
}

export async function encryptJSON(
  key: CryptoKey,
  obj: unknown,
): Promise<{ ivHex: string; ciphertextHex: string }> {
  const iv = randomBytes(12)
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { ivHex: toHex(iv), ciphertextHex: toHex(new Uint8Array(ct)) }
}

export async function decryptJSON(
  key: CryptoKey,
  ivHex: string,
  ciphertextHex: string,
): Promise<unknown> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(ivHex) },
    key,
    fromHex(ciphertextHex),
  )
  return JSON.parse(new TextDecoder().decode(pt))
}
