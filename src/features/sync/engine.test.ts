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
  it('pushes encrypted state and pulls it back decrypted on another engine', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["alice"]')
    const server = new FakeServer()
    const salt = '00112233445566778899aabbccddeeff'

    const a = await SyncEngine.create('pw', salt, server as any)
    const push = await a.pushLocal()
    expect(push.ok).toBe(true)

    localStorage.clear() // simulate a second device
    const b = await SyncEngine.create('pw', salt, server as any)
    const pulled = await b.pullRemote()
    expect(pulled.applied).toBe(true)
    expect(localStorage.getItem('dormAssignments-guests')).toBe('["alice"]')
  })

  it('a wrong password cannot decrypt the pulled blob', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["bob"]')
    const server = new FakeServer()
    const salt = '00112233445566778899aabbccddeeff'
    await (await SyncEngine.create('right-pw', salt, server as any)).pushLocal()
    const bad = await SyncEngine.create('wrong-pw', salt, server as any)
    await expect(bad.pullRemote()).rejects.toThrow()
  })
})
