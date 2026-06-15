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

const DEFAULT_TIMEOUT_MS = 12_000

export class SyncClient {
  constructor(
    private baseUrl: string,
    private fetchFn: FetchFn = fetch,
    private timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  private url(path: string) {
    return this.baseUrl.replace(/\/$/, '') + path
  }

  // Fetch with an abort-based timeout so a black-hole server (accepts the
  // connection but never responds) rejects instead of hanging forever — the
  // caller then degrades to offline as designed.
  private async fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
    const doFetch = this.fetchFn // local ref: keep `this` off the global fetch
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await doFetch(this.url(path), { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async pull(authProofHex: string): Promise<StoredRecord | null> {
    const res = await this.fetchWithTimeout('/v1/pull', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authProofHex}` },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)
    return (await res.json()) as StoredRecord
  }

  async push(authProofHex: string, body: PushBody): Promise<PushResult> {
    const res = await this.fetchWithTimeout('/v1/push', {
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
