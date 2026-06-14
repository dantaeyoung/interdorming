import { describe, it, expect } from 'vitest'
import { SyncEngine } from './engine'
import type { StoredRecord, PushBody, PushResult } from './client'
import { installLocalStorageMock } from './testLocalStorage'

installLocalStorageMock()

class FakeServer {
  rec: StoredRecord | null = null
  async pull() {
    return this.rec
  }
  async push(_p: string, b: PushBody): Promise<PushResult> {
    const cur = this.rec?.revision ?? 0
    if (b.baseRevision !== cur) return { ok: false, conflict: true, currentRevision: cur }
    this.rec = { revision: cur + 1, salt: b.salt, iv: b.iv, ciphertext: b.ciphertext }
    return { ok: true, revision: this.rec.revision }
  }
}

describe('SyncEngine', () => {
  it('pushes encrypted state and pulls it back decrypted on another engine — no pre-shared salt', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["alice"]')
    const server = new FakeServer()

    // Device A mints its own workspace salt on first push.
    const a = await SyncEngine.create('pw', server as any)
    const push = await a.pushLocal()
    expect(push.ok).toBe(true)
    expect(a.currentSaltHex).toBeTruthy()

    localStorage.clear() // simulate a second device that knows ONLY the password
    const b = await SyncEngine.create('pw', server as any)
    const pulled = await b.pullRemote()
    expect(pulled.applied).toBe(true)
    expect(localStorage.getItem('dormAssignments-guests')).toBe('["alice"]')
    // B adopted the salt that travelled with the record.
    expect(b.currentSaltHex).toBe(a.currentSaltHex)
  })

  it('a wrong password cannot decrypt the pulled blob', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["bob"]')
    const server = new FakeServer()
    await (await SyncEngine.create('right-pw', server as any)).pushLocal()
    // FakeServer ignores auth, so the wrong password still receives the blob —
    // but the salted encKey is wrong, so decrypt must throw.
    const bad = await SyncEngine.create('wrong-pw', server as any)
    await expect(bad.pullRemote()).rejects.toThrow()
  })
})
