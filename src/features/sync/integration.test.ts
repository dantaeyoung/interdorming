// @vitest-environment node
//
// Runs in the `node` environment (not jsdom) so the real Node `fetch` (undici)
// and `AbortController` come from the same realm — jsdom's AbortSignal is a
// different class that undici rejects. In a real browser both are same-realm,
// so this is a test-harness concern only. localStorage is provided by
// installLocalStorageMock below.
/**
 * Client ↔ server integration test.
 *
 * Why this exists: every sync bug found in manual E2E lived at a SEAM that the
 * unit tests mocked away — the real browser fetch, the real wire contract, the
 * real proof/id hashing. Unit tests with a fake transport are structurally
 * blind to those. This test runs the REAL Go server as a child process and
 * drives a REAL SyncClient (real Node fetch) + SyncEngine through a full
 * encrypted round-trip, the 404 path, and the revision-conflict seatbelt.
 *
 * Server binary resolution (first hit wins):
 *   1. $DORMSYNC_BIN — explicit path to a prebuilt binary.
 *   2. sync-server/.testbin/dormsync — locally cached (e.g. cross-compiled).
 *   3. `go build` from sync-server/ if `go` is on PATH.
 * If none are available the suite SKIPS with a loud warning (so `npm test`
 * stays green for contributors without Go, but a skip is never mistaken for a
 * pass). CI with Go — and the VPS — run it for real.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdtempSync, rmSync, accessSync, constants } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { SyncClient } from './client'
import { SyncEngine } from './engine'
import { installLocalStorageMock } from './testLocalStorage'

// Vitest runs from the repo root, so the sync-server dir is a stable relative path.
const syncServerDir = resolve(process.cwd(), 'sync-server')

function resolveServerBinary(): string | null {
  if (process.env.DORMSYNC_BIN && existsSync(process.env.DORMSYNC_BIN)) {
    return process.env.DORMSYNC_BIN
  }
  const cached = join(syncServerDir, '.testbin', 'dormsync')
  if (existsSync(cached)) {
    try {
      accessSync(cached, constants.X_OK)
      return cached
    } catch {
      /* not executable — fall through */
    }
  }
  // Try building from source if Go is available.
  const hasGo = spawnSync('go', ['version'], { stdio: 'ignore' }).status === 0
  if (hasGo) {
    const out = join(mkdtempSync(join(tmpdir(), 'dormsync-build-')), 'dormsync')
    const build = spawnSync('go', ['build', '-o', out, '.'], { cwd: syncServerDir, stdio: 'inherit' })
    if (build.status === 0 && existsSync(out)) return out
  }
  return null
}

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => res(port))
    })
  })
}

async function waitForServer(url: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url + '/v1/pull', {
        method: 'POST',
        headers: { Authorization: 'Bearer deadbeef' },
      })
      // 404 (no workspace) or 401 means the server is answering.
      if (res.status === 404 || res.status === 401) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('server did not become ready in time')
}

const binary = resolveServerBinary()
const describeOrSkip = binary ? describe : describe.skip

if (!binary) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n[integration.test] SKIPPED — no dormsync server binary found.\n' +
      '  Provide one of: $DORMSYNC_BIN, sync-server/.testbin/dormsync, or `go` on PATH.\n' +
      '  This suite verifies the real client↔server seam; a skip is NOT a pass.\n',
  )
}

installLocalStorageMock()

describeOrSkip('client ↔ server integration (real Go server)', () => {
  let proc: ChildProcess
  let baseUrl: string
  let dbDir: string

  beforeAll(async () => {
    const port = await freePort()
    baseUrl = `http://127.0.0.1:${port}`
    dbDir = mkdtempSync(join(tmpdir(), 'dormsync-it-'))
    proc = spawn(binary!, [], {
      env: { ...process.env, PORT: String(port), DB_PATH: join(dbDir, 'sync.db') },
      stdio: 'ignore',
    })
    await waitForServer(baseUrl)
  }, 20000)

  afterAll(() => {
    proc?.kill('SIGKILL')
    if (dbDir) rmSync(dbDir, { recursive: true, force: true })
  })

  it('pull on an unknown workspace returns null (real 404)', async () => {
    const client = new SyncClient(baseUrl)
    // A valid 64-hex proof that no one has pushed under.
    expect(await client.pull('a'.repeat(64))).toBeNull()
  })

  it('encrypts on device A, pushes, and device B pulls + decrypts it back', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["alice","bob"]')
    localStorage.setItem('dormAssignments-viewDate', '"2026-06-15"')

    const a = await SyncEngine.fromPassword('shared-pw', new SyncClient(baseUrl))
    const push = await a.pushLocal()
    expect(push.ok).toBe(true)

    // Device B: only the password, no pre-shared salt (the real bootstrap path).
    localStorage.clear()
    const b = await SyncEngine.fromPassword('shared-pw', new SyncClient(baseUrl))
    const pulled = await b.pullRemote()
    expect(pulled.applied).toBe(true)
    expect(localStorage.getItem('dormAssignments-guests')).toBe('["alice","bob"]')
    expect(localStorage.getItem('dormAssignments-viewDate')).toBe('"2026-06-15"')
  })

  it('rejects a wrong password (cannot decrypt the pulled blob)', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["carol"]')
    await (await SyncEngine.fromPassword('right-pw-xyz', new SyncClient(baseUrl))).pushLocal()

    localStorage.clear()
    const wrong = await SyncEngine.fromPassword('wrong-pw-xyz', new SyncClient(baseUrl))
    // Wrong password derives a different workspaceId → its own workspace → 404,
    // so nothing is applied (it never even sees the other blob). Either way, no
    // foreign data leaks into this device.
    const pulled = await wrong.pullRemote()
    expect(pulled.applied).toBe(false)
    expect(localStorage.getItem('dormAssignments-guests')).toBeNull()
  })

  it('enforces the revision seatbelt over the wire (409 on a stale push)', async () => {
    localStorage.clear()
    localStorage.setItem('dormAssignments-guests', '["v1"]')
    const a = await SyncEngine.fromPassword('seatbelt-pw', new SyncClient(baseUrl))
    const first = await a.pushLocal()
    expect(first.ok).toBe(true)

    // A second engine that pushed from a stale base (revision 0) must conflict.
    localStorage.setItem('dormAssignments-guests', '["v2"]')
    const stale = await SyncEngine.fromPassword('seatbelt-pw', new SyncClient(baseUrl))
    // stale.lastRevision is 0 (never pulled), server is at 1 → 409.
    const result = await stale.pushLocal()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.conflict).toBe(true)
  })
})
