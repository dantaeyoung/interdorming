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

// Identity (auth) is derived with a FIXED application salt so that every device
// computes the SAME authProof / workspaceId from the password alone — no
// discovery step, no chicken-and-egg with the per-workspace salt. This is the
// LOWER-stakes secret: cracking it only grants server read/write of ciphertext
// you still cannot decrypt. The encryption key (deriveEncKey) keeps a RANDOM
// per-workspace salt, so the data blob retains full salted protection.
// The string is exactly 16 ASCII bytes.
const FIXED_APP_SALT = new TextEncoder().encode('dormsync-auth-v1')

async function pbkdf2Bits(password: string, salt: Uint8Array, bits: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const out = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    bits,
  )
  return new Uint8Array(out)
}

export interface AuthIdentity {
  authProofHex: string // 32 bytes hex — sent to server in the Authorization header
  workspaceId: string // SHA-256(authProof) hex — server row key
}

// Deterministic from the password (fixed salt). Same password -> same workspace.
export async function deriveAuth(password: string): Promise<AuthIdentity> {
  const authProof = await pbkdf2Bits(password, FIXED_APP_SALT, 256) // 32 bytes
  const idDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', authProof))
  return { authProofHex: toHex(authProof), workspaceId: toHex(idDigest) }
}

// AES-256-GCM key derived from password + the random per-workspace salt. The
// salt is minted on first push and travels back with every pull.
export async function deriveEncKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encRaw = await pbkdf2Bits(password, salt, 256) // 32 bytes
  return crypto.subtle.importKey('raw', encRaw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
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
