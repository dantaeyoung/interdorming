import { describe, it, expect } from 'vitest'
import { toHex, fromHex, randomBytes, deriveKeys, encryptJSON, decryptJSON } from './crypto'

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

describe('deriveKeys', () => {
  it('derives stable keys from password + salt', async () => {
    const salt = fromHex('00112233445566778899aabbccddeeff')
    const k1 = await deriveKeys('correct horse battery staple', salt)
    const k2 = await deriveKeys('correct horse battery staple', salt)
    expect(k1.authProofHex).toBe(k2.authProofHex)
    expect(k1.workspaceId).toBe(k2.workspaceId)
    expect(k1.authProofHex).toHaveLength(64) // 32 bytes
    expect(k1.workspaceId).toHaveLength(64) // SHA-256 hex
    expect(k1.authProofHex).not.toBe(k1.workspaceId) // proof != its hash
  })

  it('different password yields different keys', async () => {
    const salt = fromHex('00112233445566778899aabbccddeeff')
    const a = await deriveKeys('password-a', salt)
    const b = await deriveKeys('password-b', salt)
    expect(a.workspaceId).not.toBe(b.workspaceId)
  })
})

describe('encrypt/decrypt', () => {
  it('encrypts and decrypts a JSON payload', async () => {
    const { encKey } = await deriveKeys('pw', randomBytes(16))
    const payload = { hello: 'world', n: 42 }
    const { ivHex, ciphertextHex } = await encryptJSON(encKey, payload)
    expect(ciphertextHex.length).toBeGreaterThan(0)
    const back = await decryptJSON(encKey, ivHex, ciphertextHex)
    expect(back).toEqual(payload)
  })

  it('fails to decrypt with the wrong key', async () => {
    const a = await deriveKeys('pw-a', fromHex('00112233445566778899aabbccddeeff'))
    const b = await deriveKeys('pw-b', fromHex('00112233445566778899aabbccddeeff'))
    const { ivHex, ciphertextHex } = await encryptJSON(a.encKey, { secret: 1 })
    await expect(decryptJSON(b.encKey, ivHex, ciphertextHex)).rejects.toThrow()
  })
})
