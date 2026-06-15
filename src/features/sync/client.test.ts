import { describe, it, expect, vi } from 'vitest'
import { SyncClient } from './client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('SyncClient', () => {
  it('pull returns null on 404 (no workspace yet)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    const c = new SyncClient('https://sync.example', fetchFn)
    expect(await c.pull('PROOF')).toBeNull()
    const [url, opts] = fetchFn.mock.calls[0]
    expect(url).toBe('https://sync.example/v1/pull')
    expect(opts.headers.Authorization).toBe('Bearer PROOF')
  })

  it('pull returns the stored record on 200', async () => {
    const rec = { revision: 3, salt: 'aa', iv: 'bb', ciphertext: 'cc' }
    const c = new SyncClient('https://sync.example', vi.fn().mockResolvedValue(jsonResponse(200, rec)))
    expect(await c.pull('PROOF')).toEqual(rec)
  })

  it('push returns {revision} on 200', async () => {
    const c = new SyncClient(
      'https://sync.example',
      vi.fn().mockResolvedValue(jsonResponse(200, { revision: 4 })),
    )
    const r = await c.push('PROOF', { baseRevision: 3, salt: 'aa', iv: 'bb', ciphertext: 'cc' })
    expect(r).toEqual({ ok: true, revision: 4 })
  })

  it('does not bind the SyncClient as `this` on fetch (browser fetch needs window this)', async () => {
    let capturedThis: unknown = 'unset'
    function fakeFetch(this: unknown) {
      capturedThis = this
      return Promise.resolve(new Response('', { status: 404 }))
    }
    const c = new SyncClient('https://sync.example', fakeFetch as unknown as typeof fetch)
    await c.pull('PROOF')
    // If we call `this.fetchFn(...)`, real browser fetch throws "Illegal
    // invocation". Guard: the client instance must never be fetch's `this`.
    expect(capturedThis).not.toBe(c)
  })

  it('push reports a conflict on 409', async () => {
    const c = new SyncClient(
      'https://sync.example',
      vi.fn().mockResolvedValue(jsonResponse(409, { currentRevision: 7 })),
    )
    const r = await c.push('PROOF', { baseRevision: 3, salt: 'aa', iv: 'bb', ciphertext: 'cc' })
    expect(r).toEqual({ ok: false, conflict: true, currentRevision: 7 })
  })
})
