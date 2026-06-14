export interface StoredRecord {
  revision: number
  salt: string
  iv: string
  ciphertext: string
}
export interface PushBody {
  baseRevision: number
  salt: string
  iv: string
  ciphertext: string
}
export type PushResult =
  | { ok: true; revision: number }
  | { ok: false; conflict: true; currentRevision: number }

type FetchFn = typeof fetch

export class SyncClient {
  constructor(
    private baseUrl: string,
    private fetchFn: FetchFn = fetch,
  ) {}

  private url(path: string) {
    return this.baseUrl.replace(/\/$/, '') + path
  }

  async pull(authProofHex: string): Promise<StoredRecord | null> {
    // Call through a local ref so `this` isn't the SyncClient — the browser's
    // real fetch throws "Illegal invocation" unless its `this` is window.
    const doFetch = this.fetchFn
    const res = await doFetch(this.url('/v1/pull'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authProofHex}` },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)
    return (await res.json()) as StoredRecord
  }

  async push(authProofHex: string, body: PushBody): Promise<PushResult> {
    const doFetch = this.fetchFn
    const res = await doFetch(this.url('/v1/push'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authProofHex}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return { ok: true, revision: (await res.json()).revision }
    if (res.status === 409)
      return { ok: false, conflict: true, currentRevision: (await res.json()).currentRevision }
    throw new Error(`push failed: ${res.status}`)
  }
}
