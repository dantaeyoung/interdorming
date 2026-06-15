import { describe, it, expect } from 'vitest'
import { toHex, fromHex, randomBytes, deriveAuth, deriveEncKey, encryptJSON, decryptJSON } from './crypto'

describe('hex helpers', () => {
  it('round-trips bytes through hex', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255])
    expect(toHex(bytes)).toBe('00010f10ff')
    expect(fromHex('00010f10ff')).toEqual(bytes)
  })
  it('randomBytes returns the requested length and varies', () => {
    const a = randomBytes(16)
    const b = randomBytes(16)
    expect(a.length).toBe(16)
    expect(toHex(a)).not.toBe(toHex(b))
  })
})

describe('deriveAuth (deterministic identity)', () => {
  it('derives a stable authProof + workspaceId from the password alone', async () => {
    const k1 = await deriveAuth('correct horse battery staple')
    const k2 = await deriveAuth('correct horse battery staple')
    expect(k1.authProofHex).toBe(k2.authProofHex)
    expect(k1.workspaceId).toBe(k2.workspaceId)
    expect(k1.authProofHex).toHaveLength(64) // 32 bytes
    expect(k1.workspaceId).toHaveLength(64) // SHA-256 hex
    expect(k1.authProofHex).not.toBe(k1.workspaceId) // proof != its hash
  })

  it('different password yields a different workspace', async () => {
    const a = await deriveAuth('password-a')
    const b = await deriveAuth('password-b')
    expect(a.workspaceId).not.toBe(b.workspaceId)
    expect(a.authProofHex).not.toBe(b.authProofHex)
  })
})

describe('deriveEncKey (salted encryption key)', () => {
  it('same password + salt encrypts/decrypts; the workspace salt matters', async () => {
    const salt = fromHex('00112233445566778899aabbccddeeff')
    const k1 = await deriveEncKey('pw', salt)
    const k2 = await deriveEncKey('pw', salt)
    const { ivHex, ciphertextHex } = await encryptJSON(k1, { ok: true })
    expect(await decryptJSON(k2, ivHex, ciphertextHex)).toEqual({ ok: true })
  })

  it('a different salt produces a key that cannot decrypt', async () => {
    const k1 = await deriveEncKey('pw', fromHex('00'.repeat(16)))
    const k2 = await deriveEncKey('pw', fromHex('11'.repeat(16)))
    const { ivHex, ciphertextHex } = await encryptJSON(k1, { secret: 1 })
    await expect(decryptJSON(k2, ivHex, ciphertextHex)).rejects.toThrow()
  })
})

// Frozen cross-language vector. These two constants pin the client/server
// contract: the server must compute the SAME workspaceId from the SAME
// authProof. authProof is now derived from the password ALONE (fixed app salt),
// so there is no salt in this vector. The matching Go test is
// TestWorkspaceIdVector in sync-server/handlers_test.go — change one, change both.
const VECTOR_PASSWORD = 'test-vector-pw'
const VECTOR_AUTH_PROOF_HEX = 'ace19f007a7a3e1d86df14ea3e0fa2ab0155f6ddbdd49d5995d501e5f49fe385'
const VECTOR_WORKSPACE_ID = '7babbdb1c3de7d98c121ebc5f8fc05f89611eaf1ec2f19e5cdd41e643fd4c99c'

describe('frozen workspace-id vector (client/server contract)', () => {
  it('produces the frozen authProof + workspaceId', async () => {
    const k = await deriveAuth(VECTOR_PASSWORD)
    expect(k.authProofHex).toBe(VECTOR_AUTH_PROOF_HEX)
    expect(k.workspaceId).toBe(VECTOR_WORKSPACE_ID)
  })
})

describe('encrypt/decrypt', () => {
  it('encrypts and decrypts a JSON payload', async () => {
    const encKey = await deriveEncKey('pw', randomBytes(16))
    const payload = { hello: 'world', n: 42 }
    const { ivHex, ciphertextHex } = await encryptJSON(encKey, payload)
    expect(ciphertextHex.length).toBeGreaterThan(0)
    const back = await decryptJSON(encKey, ivHex, ciphertextHex)
    expect(back).toEqual(payload)
  })

  it('fails to decrypt with the wrong key', async () => {
    const a = await deriveEncKey('pw-a', fromHex('00112233445566778899aabbccddeeff'))
    const b = await deriveEncKey('pw-b', fromHex('00112233445566778899aabbccddeeff'))
    const { ivHex, ciphertextHex } = await encryptJSON(a, { secret: 1 })
    await expect(decryptJSON(b, ivHex, ciphertextHex)).rejects.toThrow()
  })
})
