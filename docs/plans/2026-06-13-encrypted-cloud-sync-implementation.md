# Encrypted Cloud Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional, end-to-end-encrypted cloud sync layer so guest/assignment data round-trips between devices/operators through a self-hosted server, while localStorage remains the source of truth and the app stays fully functional with sync off.

**Architecture:** The browser encrypts a single JSON snapshot of all `dormAssignments-*` localStorage state (WebCrypto: `PBKDF2` → `AES-256-GCM`) and PUT/GETs it to a tiny Go + SQLite server. Conflict handling is last-write-wins guarded by a monotonic revision (the "seatbelt"). The password derives both the encryption key (never leaves the browser) and an auth proof; the workspace id is `SHA-256(authProof)`, so the password alone gates read+write. Sync is opt-in, off by default, and every network failure is non-fatal.

**Tech Stack:** Vue 3 + Pinia + Vitest (client); WebCrypto (no new browser deps); Go + `modernc.org/sqlite` (pure-Go, no CGO) + `net/http`/`httptest` (server); Caddy for TLS.

**Design reference:** `docs/plans/2026-06-13-encrypted-cloud-sync-design.md`

---

## Conventions

- TDD throughout: failing test → run it red → minimal impl → run it green → commit.
- Client tests: `npm run test -- <path>`. Server tests: `cd sync-server && go test ./...`.
- Commit after every green step. Keep commits small.
- New client code lives under `src/features/sync/`. Server lives under `sync-server/` (in-repo monorepo so it versions with the app).
- **Refinement over the design doc:** transmit `authProof` (the preimage) in the `Authorization` header; the server stores/looks up rows by `workspaceId = SHA-256(authProof)`. A DB/backup leak therefore yields only hashes — it does **not** grant write access. No separate `proof_hash` column is needed (the primary key *is* the hash).

---

## Phase 1: Client crypto primitives (pure, TDD)

### Task 1: Hex + random helpers

**Files:**
- Create: `src/features/sync/crypto.ts`
- Test: `src/features/sync/crypto.test.ts`

**Step 1 — failing test:**
```ts
import { describe, it, expect } from 'vitest'
import { toHex, fromHex, randomBytes } from './crypto'

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
```

**Step 2 — run red:** `npm run test -- src/features/sync/crypto.test.ts` → FAIL (module/exports missing).

**Step 3 — implement:**
```ts
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
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): hex + random crypto helpers`.

---

### Task 2: Key derivation (PBKDF2 → encKey + authProof + workspaceId)

**Files:** Modify `src/features/sync/crypto.ts`; Test same file.

**Step 1 — failing test:**
```ts
import { deriveKeys } from './crypto'

it('derives stable keys from password + salt', async () => {
  const salt = fromHex('00112233445566778899aabbccddeeff')
  const k1 = await deriveKeys('correct horse battery staple', salt)
  const k2 = await deriveKeys('correct horse battery staple', salt)
  expect(k1.authProofHex).toBe(k2.authProofHex)
  expect(k1.workspaceId).toBe(k2.workspaceId)
  expect(k1.authProofHex).toHaveLength(64)      // 32 bytes
  expect(k1.workspaceId).toHaveLength(64)        // SHA-256 hex
  expect(k1.authProofHex).not.toBe(k1.workspaceId) // proof != its hash
})

it('different password yields different keys', async () => {
  const salt = fromHex('00112233445566778899aabbccddeeff')
  const a = await deriveKeys('password-a', salt)
  const b = await deriveKeys('password-b', salt)
  expect(a.workspaceId).not.toBe(b.workspaceId)
})
```

**Step 2 — run red.**

**Step 3 — implement** (append to `crypto.ts`):
```ts
const PBKDF2_ITERATIONS = 600_000

export interface DerivedKeys {
  encKey: CryptoKey          // AES-256-GCM, non-extractable
  authProofHex: string       // 32 bytes hex — sent to server
  workspaceId: string        // SHA-256(authProof) hex — server lookup key
}

export async function deriveKeys(password: string, salt: Uint8Array): Promise<DerivedKeys> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    512, // 64 bytes
  )
  const material = new Uint8Array(bits)
  const encRaw = material.slice(0, 32)
  const authProof = material.slice(32, 64)
  const encKey = await crypto.subtle.importKey('raw', encRaw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  const idDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', authProof))
  return { encKey, authProofHex: toHex(authProof), workspaceId: toHex(idDigest) }
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): PBKDF2 key derivation with auth-proof split`.

---

### Task 3: Encrypt / decrypt round-trip

**Files:** Modify `src/features/sync/crypto.ts`; Test same file.

**Step 1 — failing test:**
```ts
import { deriveKeys, encryptJSON, decryptJSON, randomBytes } from './crypto'

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
```

**Step 2 — run red.**

**Step 3 — implement:**
```ts
export async function encryptJSON(key: CryptoKey, obj: unknown): Promise<{ ivHex: string; ciphertextHex: string }> {
  const iv = randomBytes(12)
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { ivHex: toHex(iv), ciphertextHex: toHex(new Uint8Array(ct)) }
}

export async function decryptJSON(key: CryptoKey, ivHex: string, ciphertextHex: string): Promise<unknown> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(ivHex) }, key, fromHex(ciphertextHex))
  return JSON.parse(new TextDecoder().decode(pt))
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): AES-256-GCM JSON encrypt/decrypt`.

---

## Phase 2: Snapshot gather / apply (TDD)

### Task 4: Snapshot manifest from localStorage

The snapshot is all `dormAssignments-*` keys EXCEPT a denylist (the sync config, which must never be encrypted-and-pushed because it holds the server URL / remember-me state).

**Files:**
- Create: `src/features/sync/snapshot.ts`
- Test: `src/features/sync/snapshot.test.ts`

**Step 1 — failing test:**
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { gatherSnapshot, applySnapshot, SNAPSHOT_SCHEMA_VERSION } from './snapshot'

beforeEach(() => localStorage.clear())

it('gathers all dormAssignments-* keys except the sync config', () => {
  localStorage.setItem('dormAssignments-guests', '[1,2,3]')
  localStorage.setItem('dormAssignments-viewDate', '"2026-06-01"')
  localStorage.setItem('dormAssignments-sync', '{"serverUrl":"x"}') // must be excluded
  localStorage.setItem('unrelated-key', 'nope')                      // must be excluded
  const snap = gatherSnapshot()
  expect(snap.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION)
  expect(Object.keys(snap.data).sort()).toEqual(['dormAssignments-guests', 'dormAssignments-viewDate'])
})

it('applies a snapshot, replacing managed keys and leaving others alone', () => {
  localStorage.setItem('dormAssignments-guests', 'OLD')
  localStorage.setItem('dormAssignments-sync', 'KEEP')
  applySnapshot({ schemaVersion: SNAPSHOT_SCHEMA_VERSION, data: { 'dormAssignments-guests': 'NEW' } })
  expect(localStorage.getItem('dormAssignments-guests')).toBe('NEW')
  expect(localStorage.getItem('dormAssignments-sync')).toBe('KEEP')
})
```

**Step 2 — run red.**

**Step 3 — implement:**
```ts
export const SNAPSHOT_SCHEMA_VERSION = 1
export const SYNC_CONFIG_KEY = 'dormAssignments-sync'
const PREFIX = 'dormAssignments-'

export interface Snapshot {
  schemaVersion: number
  data: Record<string, string>
}

function managedKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!
    if (k.startsWith(PREFIX) && k !== SYNC_CONFIG_KEY) keys.push(k)
  }
  return keys
}

export function gatherSnapshot(): Snapshot {
  const data: Record<string, string> = {}
  for (const k of managedKeys()) data[k] = localStorage.getItem(k)!
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, data }
}

export function applySnapshot(snap: Snapshot): void {
  // Remove managed keys not present in the incoming snapshot, then write incoming.
  for (const k of managedKeys()) if (!(k in snap.data)) localStorage.removeItem(k)
  for (const [k, v] of Object.entries(snap.data)) localStorage.setItem(k, v)
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): localStorage snapshot gather/apply`.

> **Note for executor:** after `applySnapshot`, Pinia stores must re-hydrate from localStorage. This is handled at integration time (Task 14) by reloading affected stores / `location.reload()` on pull-apply. Keep that out of this pure module.

---

### Task 5: Stable snapshot hashing (for debounce dedupe)

**Files:** Modify `src/features/sync/snapshot.ts`; Test same file.

**Step 1 — failing test:**
```ts
import { hashSnapshot } from './snapshot'

it('hashes equal snapshots equally and differs on change', async () => {
  const a = { schemaVersion: 1, data: { x: '1', y: '2' } }
  const b = { schemaVersion: 1, data: { y: '2', x: '1' } } // key order differs
  const c = { schemaVersion: 1, data: { x: '9', y: '2' } }
  expect(await hashSnapshot(a)).toBe(await hashSnapshot(b))
  expect(await hashSnapshot(a)).not.toBe(await hashSnapshot(c))
})
```

**Step 2 — run red.**

**Step 3 — implement** (sort keys for stability, hash with SHA-256):
```ts
import { toHex } from './crypto'

export async function hashSnapshot(snap: Snapshot): Promise<string> {
  const sorted = Object.keys(snap.data).sort().map((k) => [k, snap.data[k]])
  const canonical = JSON.stringify({ v: snap.schemaVersion, d: sorted })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return toHex(new Uint8Array(digest))
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): stable snapshot hashing for change detection`.

---

## Phase 3: Sync protocol client (TDD with injected fetch)

### Task 6: Client transport (pull/push against a mock)

The client takes an injected `fetch`-like function so it's unit-testable without a server.

**Files:**
- Create: `src/features/sync/client.ts`
- Test: `src/features/sync/client.test.ts`

**Step 1 — failing test:**
```ts
import { describe, it, expect, vi } from 'vitest'
import { SyncClient } from './client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

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
  const c = new SyncClient('https://sync.example', vi.fn().mockResolvedValue(jsonResponse(200, { revision: 4 })))
  const r = await c.push('PROOF', { baseRevision: 3, salt: 'aa', iv: 'bb', ciphertext: 'cc' })
  expect(r).toEqual({ ok: true, revision: 4 })
})

it('push reports a conflict on 409', async () => {
  const c = new SyncClient('https://sync.example', vi.fn().mockResolvedValue(jsonResponse(409, { currentRevision: 7 })))
  const r = await c.push('PROOF', { baseRevision: 3, salt: 'aa', iv: 'bb', ciphertext: 'cc' })
  expect(r).toEqual({ ok: false, conflict: true, currentRevision: 7 })
})
```

**Step 2 — run red.**

**Step 3 — implement:**
```ts
export interface StoredRecord { revision: number; salt: string; iv: string; ciphertext: string }
export interface PushBody { baseRevision: number; salt: string; iv: string; ciphertext: string }
export type PushResult =
  | { ok: true; revision: number }
  | { ok: false; conflict: true; currentRevision: number }

type FetchFn = typeof fetch

export class SyncClient {
  constructor(private baseUrl: string, private fetchFn: FetchFn = fetch) {}

  private url(path: string) { return this.baseUrl.replace(/\/$/, '') + path }

  async pull(authProofHex: string): Promise<StoredRecord | null> {
    const res = await this.fetchFn(this.url('/v1/pull'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authProofHex}` },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)
    return (await res.json()) as StoredRecord
  }

  async push(authProofHex: string, body: PushBody): Promise<PushResult> {
    const res = await this.fetchFn(this.url('/v1/push'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authProofHex}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return { ok: true, revision: (await res.json()).revision }
    if (res.status === 409) return { ok: false, conflict: true, currentRevision: (await res.json()).currentRevision }
    throw new Error(`push failed: ${res.status}`)
  }
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): SyncClient transport with pull/push/conflict`.

---

### Task 7: High-level engine — encrypt+push and pull+decrypt

Ties crypto + snapshot + client together. Still no UI, still unit-testable with an in-memory fake server.

**Files:**
- Create: `src/features/sync/engine.ts`
- Test: `src/features/sync/engine.test.ts`

**Step 1 — failing test** (use a tiny in-memory fake of `SyncClient`'s shape):
```ts
import { describe, it, expect } from 'vitest'
import { SyncEngine } from './engine'
import type { StoredRecord, PushBody, PushResult } from './client'

class FakeServer {
  rec: StoredRecord | null = null
  async pull() { return this.rec }
  async push(_p: string, b: PushBody): Promise<PushResult> {
    const cur = this.rec?.revision ?? 0
    if (b.baseRevision !== cur) return { ok: false, conflict: true, currentRevision: cur }
    this.rec = { revision: cur + 1, salt: b.salt, iv: b.iv, ciphertext: b.ciphertext }
    return { ok: true, revision: this.rec.revision }
  }
}

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
```

**Step 2 — run red.**

**Step 3 — implement:**
```ts
import { deriveKeys, encryptJSON, decryptJSON, fromHex, type DerivedKeys } from './crypto'
import { gatherSnapshot, applySnapshot, type Snapshot } from './snapshot'
import type { StoredRecord, PushBody, PushResult } from './client'

interface Transport {
  pull(authProofHex: string): Promise<StoredRecord | null>
  push(authProofHex: string, body: PushBody): Promise<PushResult>
}

export class SyncEngine {
  private constructor(
    private keys: DerivedKeys,
    private saltHex: string,
    private transport: Transport,
    public lastRevision = 0,
  ) {}

  static async create(password: string, saltHex: string, transport: Transport): Promise<SyncEngine> {
    const keys = await deriveKeys(password, fromHex(saltHex))
    return new SyncEngine(keys, saltHex, transport)
  }

  async pushLocal(): Promise<PushResult> {
    const snap = gatherSnapshot()
    const { ivHex, ciphertextHex } = await encryptJSON(this.keys.encKey, snap)
    const result = await this.transport.push(this.keys.authProofHex, {
      baseRevision: this.lastRevision,
      salt: this.saltHex,
      iv: ivHex,
      ciphertext: ciphertextHex,
    })
    if (result.ok) this.lastRevision = result.revision
    return result
  }

  async pullRemote(): Promise<{ applied: boolean; revision: number }> {
    const rec = await this.transport.pull(this.keys.authProofHex)
    if (!rec) return { applied: false, revision: this.lastRevision }
    const snap = (await decryptJSON(this.keys.encKey, rec.iv, rec.ciphertext)) as Snapshot
    applySnapshot(snap)
    this.lastRevision = rec.revision
    return { applied: true, revision: rec.revision }
  }
}
```

**Step 4 — run green.** **Step 5 — commit:** `feat(sync): SyncEngine encrypt-push / pull-decrypt`.

---

## Phase 4: Go + SQLite server (TDD)

### Task 8: Server scaffolding + schema

**Files:**
- Create: `sync-server/go.mod` (`module dormsync`, `go 1.23`)
- Create: `sync-server/store.go` (SQLite open + schema)
- Test: `sync-server/store_test.go`

Schema (one table; primary key IS `SHA-256(authProof)`):
```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,   -- hex SHA-256(authProof)
  revision    INTEGER NOT NULL,
  salt        TEXT NOT NULL,
  iv          TEXT NOT NULL,
  ciphertext  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
```

**Step 1 — failing test:** open an in-memory DB, `Get` a missing id returns `(nil, nil)`; after `Put`, `Get` returns the record with `revision = 1`.

```go
func TestStorePutGet(t *testing.T) {
    s, err := OpenStore(":memory:")
    if err != nil { t.Fatal(err) }
    if rec, _ := s.Get("abc"); rec != nil { t.Fatal("expected nil") }
    rev, conflict, err := s.Put("abc", 0, "salt", "iv", "ct")
    if err != nil || conflict { t.Fatalf("put failed: %v conflict=%v", err, conflict) }
    if rev != 1 { t.Fatalf("want rev 1 got %d", rev) }
    rec, _ := s.Get("abc")
    if rec == nil || rec.Revision != 1 || rec.Ciphertext != "ct" { t.Fatalf("bad rec %+v", rec) }
}
```

**Step 2 — run red:** `cd sync-server && go test ./...` → FAIL (no impl).

**Step 3 — implement** `OpenStore`, `Get`, and a `Put` that enforces the revision guard:
- `Get(id) (*Record, error)` — `nil` when absent.
- `Put(id, baseRevision, salt, iv, ct) (newRev int, conflict bool, err error)`:
  - Look up current revision (0 if absent).
  - If `baseRevision != current` → `conflict=true`, no write.
  - Else upsert with `revision = current + 1`, stamp `updated_at` (and `created_at` if new). Return new revision.
- Use timestamps passed in or `time.Now().UTC().Format(time.RFC3339)` (server clock is fine for metadata).

**Step 4 — run green.** **Step 5 — commit:** `feat(server): SQLite store with revision-guarded upsert`.

---

### Task 9: Concurrency guard test (the seatbelt)

**Files:** Modify `sync-server/store_test.go`.

**Step 1 — failing test:**
```go
func TestStoreConflict(t *testing.T) {
    s, _ := OpenStore(":memory:")
    s.Put("abc", 0, "s", "i", "v1")            // rev -> 1
    _, conflict, _ := s.Put("abc", 0, "s", "i", "v2") // stale base 0, current 1
    if !conflict { t.Fatal("expected conflict") }
    rec, _ := s.Get("abc")
    if rec.Ciphertext != "v1" { t.Fatal("stale write must not overwrite") }
    rev, conflict, _ := s.Put("abc", 1, "s", "i", "v2") // correct base
    if conflict || rev != 2 { t.Fatalf("expected rev 2, got %d conflict=%v", rev, conflict) }
}
```

**Step 2 — run red** (should already pass if Task 8 implemented the guard; if it fails, fix `Put`). **Step 3 — ensure green. Step 4 — commit:** `test(server): revision conflict guard`.

---

### Task 10: HTTP handlers (`/v1/pull`, `/v1/push`) with auth-proof hashing

`Authorization: Bearer <authProofHex>` → server computes `id = hex(sha256(authProofHex bytes))` and uses it as the row key. (Hash the **bytes** of the proof, matching the client's `SHA-256(authProof)`.)

**Files:**
- Create: `sync-server/handlers.go`
- Test: `sync-server/handlers_test.go` (use `net/http/httptest`)

**Step 1 — failing tests:**
- `POST /v1/pull` with no/blank `Authorization` → `401`.
- `POST /v1/pull` for unknown workspace → `404`.
- `POST /v1/push` with `baseRevision:0` → `200 {revision:1}`; subsequent `POST /v1/pull` returns the same `salt/iv/ciphertext` and `revision:1`.
- `POST /v1/push` with a stale `baseRevision` → `409 {currentRevision:N}`.
- Body larger than the cap (e.g. > 5 MB) → `413`.

```go
func TestPushThenPull(t *testing.T) {
    srv := NewServer(mustStore(t))
    proof := "deadbeef"
    rr := doJSON(srv, "POST", "/v1/push", proof, `{"baseRevision":0,"salt":"s","iv":"i","ciphertext":"c"}`)
    if rr.Code != 200 { t.Fatalf("push code %d", rr.Code) }
    rr = doReq(srv, "POST", "/v1/pull", proof, "")
    if rr.Code != 200 { t.Fatalf("pull code %d", rr.Code) }
    // assert body contains revision 1 and ciphertext "c"
}
```
(Provide `doReq`/`doJSON` helpers that set the `Authorization` header; `mustStore` opens `:memory:`.)

**Step 2 — run red.**

**Step 3 — implement** `NewServer(store) http.Handler`:
- `idFromAuth(r)` → strip `Bearer `, hex-decode? No — the client sends `authProofHex` (already hex). Hash the **decoded bytes**: `raw, _ := hex.DecodeString(proofHex); sum := sha256.Sum256(raw); id := hex.EncodeToString(sum[:])`. Must match client's `deriveKeys.workspaceId` (which hashes the raw 32 authProof bytes). Add a cross-check test vector (Task 11).
- Enforce `http.MaxBytesReader` (5 MB) → `413` on overflow.
- `pull`: `store.Get(id)`; `nil` → `404`; else JSON `{revision,salt,iv,ciphertext}`.
- `push`: decode body; `store.Put(...)`; conflict → `409 {currentRevision}`; else `200 {revision}`.
- Always `401` if the bearer token is missing or not valid hex.

**Step 4 — run green.** **Step 5 — commit:** `feat(server): pull/push HTTP handlers with proof hashing + size cap`.

---

### Task 11: Cross-language test vector (client ↔ server id agreement)

Guards the single most breakable contract: the client's `workspaceId` must equal the server's `id` for the same proof.

**Files:** Modify `sync-server/handlers_test.go` and `src/features/sync/crypto.test.ts`.

**Steps:**
- In `crypto.test.ts`: assert a fixed vector — `deriveKeys('test-vector-pw', fromHex('00'.repeat(16)))` produces a `workspaceId` equal to a hard-coded hex string (capture the value from a first run, then freeze it).
- In Go: `TestWorkspaceIdVector` — take the SAME `authProofHex` the JS test prints for that password+salt, run it through `idFromAuth`, assert it equals the SAME hard-coded `workspaceId`. (Document in a comment that these two constants must move together.)

**Commit:** `test(sync): freeze client/server workspace-id vector`.

---

### Task 12: `main.go` — wire store + server + config

**Files:** Create `sync-server/main.go`.

- Read `PORT` (default `8787`) and `DB_PATH` (default `./sync.db`) from env.
- `OpenStore(dbPath)`, `NewServer(store)`, `http.ListenAndServe`.
- Log startup line with port + db path.
- `go build ./...` succeeds; manual smoke: `curl -s -XPOST localhost:8787/v1/pull -H 'Authorization: Bearer deadbeef' -i` → `404`.

**Commit:** `feat(server): main entrypoint with env config`.

---

## Phase 5: Pinia store + UI integration

### Task 13: `syncStore` (config + status, persisted)

**Files:**
- Create: `src/stores/syncStore.ts` (persist key `dormAssignments-sync` — the excluded key from Task 4)
- Test: `src/stores/syncStore.test.ts`

State:
- Persisted config: `enabled`, `serverUrl`, `rememberOnDevice`, `operatorName`, and (only if `rememberOnDevice`) a cached `saltHex` + cached derived material reference. **Never persist the raw password.** If remembering, persist `saltHex` + `authProofHex` + raw enc-key bytes is the trade-off the design accepted ("local data already plaintext"); store them under this key. If NOT remembering, keep them in-memory only.
- Runtime (not persisted): `status` (`'idle' | 'syncing' | 'offline' | 'conflict' | 'error' | 'locked'`), `lastSyncedAt`, `lastError`, `currentRevision`.

**Tests:** toggling `enabled` persists; `rememberOnDevice=false` means no key material in the persisted blob; status transitions are plain setters.

**Commit:** `feat(sync): syncStore for config + runtime status`.

---

### Task 14: `useSync` composable — orchestration + store re-hydration

**Files:**
- Create: `src/features/sync/useSync.ts`
- Test: `src/features/sync/useSync.test.ts` (mock `SyncEngine`)

Responsibilities:
- `unlock(password)` → derive keys (generate a fresh `saltHex` on first-ever use; otherwise use the workspace salt returned by the first pull), build `SyncEngine`, set status.
- `pullNow()` → `engine.pullRemote()`; if `applied`, **re-hydrate Pinia** (simplest robust approach: `location.reload()`; document the heavier-but-smoother alternative of calling each store's `$hydrate()`).
- `pushNow()` → `engine.pushLocal()`; on `conflict`, set status `'conflict'` and stash `currentRevision` for the banner.
- `startAuto()` → debounced auto-push (3–5 s) driven by watching `hashSnapshot()` change; auto-pull on mount + on `window` `focus` + a `setInterval` poll (20–30 s). All wrapped so a thrown/rejected network call sets `status='offline'` and never surfaces an exception to the UI.
- `resolveConflict('reload' | 'overwrite')` → reload pulls theirs; overwrite re-pushes local with `baseRevision = currentRevision`.

**Tests:** with a mocked engine, assert: debounced push fires once after multiple rapid changes; a rejected pull sets `status='offline'` (no throw); conflict result sets `status='conflict'`.

**Commit:** `feat(sync): useSync orchestration composable`.

> **Salt bootstrapping note:** the salt is created by whoever pushes first and travels with every pulled record. On a second device the flow is: pull (gets `salt`) → derive keys with that salt → decrypt. If the very first action on a fresh device is a push with no prior record, generate a new salt. `useSync.unlock` must therefore *pull first to discover an existing salt* before deciding to mint one. Cover this ordering with a test.

---

### Task 15: Settings UI — Cloud Sync section

**Files:**
- Create: `src/features/sync/SyncSettings.vue`
- Modify: `src/features/settings/SettingsPanel.vue` (mount the new section)

Controls: enable toggle, server URL, password field (+ unlock button), "remember on this device" checkbox, operator name, manual **Sync now** / **Pull now** buttons, and a plain-language warning: *"If the password is lost, the cloud copy can't be recovered — your data here on this device is safe."*

**Manual verification (no unit test — UI):** `npm run dev`, open Settings, enable sync against a locally-running `sync-server`, confirm enabling + unlock + manual push/pull works across two browser profiles.

**Commit:** `feat(sync): Cloud Sync settings panel`.

---

### Task 16: Status indicator + conflict banner

**Files:**
- Create: `src/features/sync/SyncStatusIndicator.vue` (header chip: synced / syncing / offline / conflict)
- Create: `src/features/sync/SyncConflictBanner.vue` ("Someone saved N min ago — Reload theirs / Keep mine")
- Modify: `src/App.vue` (mount indicator in header near the version tag; mount banner near top of layout)

**Manual verification:** force a conflict by pushing from profile A after profile B pushed; confirm the banner appears and both resolve paths behave (reload pulls theirs; overwrite keeps yours and bumps the revision).

**Commit:** `feat(sync): status indicator + conflict banner`.

---

## Phase 6: End-to-end + deployment

### Task 17: Two-profile end-to-end verification

Run `sync-server` locally; in two browser profiles enable sync with the same URL+password. Verify: edits in A appear in B after pull; wrong password fails to unlock cleanly; stopping the server leaves the app fully usable (status `offline`, no errors, edits persist locally); restarting resumes sync. Record results in the PR description. (No code; this is the acceptance gate.)

### Task 18: Deployment artifacts (exe.dev)

**Files:**
- Create: `sync-server/README.md` — build (`go build -o dormsync .`), env vars, run.
- Create: `sync-server/dormsync.service` — systemd unit (Restart=always, env for PORT/DB_PATH, dedicated data dir).
- Create: `sync-server/Caddyfile.example` — `sync.<domain> { reverse_proxy localhost:8787 }` (auto-HTTPS).
- Document body-size cap + that TLS is mandatory (proof travels in the header).

**Build-time decisions to finalize here** (from design §12): exact subdomain, the `sync.db` backup mechanism (litestream vs cron `git push` vs `rsync`), and final debounce/poll timings.

**Commit:** `docs(server): deployment unit + Caddy + README`.

### Task 19: Final review + merge prep

- `npm run build` (vue-tsc clean) and `npm run test` green; `cd sync-server && go test ./...` green.
- Use superpowers:requesting-code-review on the branch (security-sensitive: focus on the crypto, the proof/id contract, and the "sync never blocks the app" guarantee).
- Per `CLAUDE.md`: this lands on `development`; the **version-tag bump happens only at merge to `main`** (don't bump mid-branch).

---

## Risk / Watch-list

- **WebCrypto in tests:** Node 25 exposes `crypto.subtle` globally — Vitest works without a polyfill. If a CI runner uses older Node, add a setup shim.
- **proof/id contract (Task 11):** the one cross-language invariant. If sync silently 404s everything, suspect this first.
- **Re-hydration after pull:** `location.reload()` is the safe default; only optimize to `$hydrate()` if the reload UX is annoying.
- **Never push the sync config:** Task 4's denylist is load-bearing — pushing `dormAssignments-sync` would ship the server URL / cached key material into the encrypted blob and across devices. Keep the test.
- **No silent clobber:** the revision guard (Tasks 8–9) plus the conflict banner (Task 16) are the whole safety story. Don't add an "auto-overwrite on conflict" shortcut.
