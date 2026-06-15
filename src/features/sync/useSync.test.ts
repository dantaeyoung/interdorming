import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createApp } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSync } from './useSync'
import { DecryptError } from './crypto'
import { installLocalStorageMock } from './testLocalStorage'

installLocalStorageMock()

interface FakeEngine {
  currentSaltHex: string | null
  lastRevision: number
  setBaseRevision: (n: number) => void
  pullRemote: () => Promise<{ applied: boolean; revision: number }>
  pushLocal: () => Promise<
    { ok: true; revision: number } | { ok: false; conflict: true; currentRevision: number }
  >
}

function makeEngine(overrides: Partial<FakeEngine> = {}): FakeEngine {
  const e: FakeEngine = {
    currentSaltHex: null,
    lastRevision: 0,
    setBaseRevision(n: number) {
      e.lastRevision = n
    },
    pullRemote: vi.fn(async () => ({ applied: false, revision: 0 })),
    pushLocal: vi.fn(async () => ({ ok: true as const, revision: 1 })),
    ...overrides,
  }
  return e
}

// Track instances so their auto-loop timers/listeners are torn down per test.
const liveSyncs: Array<ReturnType<typeof useSync>> = []
function track(s: ReturnType<typeof useSync>): ReturnType<typeof useSync> {
  liveSyncs.push(s)
  return s
}

describe('useSync', () => {
  beforeEach(() => {
    localStorage.clear()
    const pinia = createPinia()
    createApp({}).use(pinia)
    setActivePinia(pinia)
    const store = useSyncStore()
    store.serverUrl = 'https://sync.example'
  })

  afterEach(() => {
    liveSyncs.forEach((s) => s.stopAuto())
    liveSyncs.length = 0
    vi.useRealTimers()
  })

  it('unlock pulls FIRST, then seeds a fresh workspace with a push', async () => {
    const calls: string[] = []
    const engine = makeEngine({
      pullRemote: vi.fn(async () => {
        calls.push('pull')
        return { applied: false, revision: 0 }
      }),
      pushLocal: vi.fn(async () => {
        calls.push('push')
        return { ok: true as const, revision: 1 }
      }),
    })
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 9999 }))
    await sync.unlock('pw')
    // Pull happens before the seed push (discover-then-seed); first device seeds
    // so a second device has something to pull (review issue #2).
    expect(calls[0]).toBe('pull')
    expect(calls).toContain('push')
    expect(useSyncStore().status).toBe('idle')
  })

  it('starts the background auto-loop on manual unlock (review issue #1)', async () => {
    const engine = makeEngine({ pullRemote: vi.fn(async () => ({ applied: false, revision: 0 })) })
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 30 }))
    await sync.unlock('pw')
    const afterUnlock = (engine.pullRemote as ReturnType<typeof vi.fn>).mock.calls.length
    // The poll (pollMs=30) must keep pulling without any manual call.
    await new Promise((r) => setTimeout(r, 80))
    const later = (engine.pullRemote as ReturnType<typeof vi.fn>).mock.calls.length
    expect(later).toBeGreaterThan(afterUnlock)
  })

  it('a rejected pull sets status=offline and never throws', async () => {
    const engine = makeEngine()
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 9999 }))
    await sync.unlock('pw')
    engine.pullRemote = vi.fn(async () => {
      throw new Error('network down')
    })
    await expect(sync.pullNow()).resolves.toBeUndefined()
    expect(useSyncStore().status).toBe('offline')
  })

  it('a decrypt failure surfaces as error, not offline (review issue #3)', async () => {
    const engine = makeEngine()
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 9999 }))
    await sync.unlock('pw')
    engine.pullRemote = vi.fn(async () => {
      throw new DecryptError()
    })
    await sync.pullNow()
    expect(useSyncStore().status).toBe('error')
    expect(useSyncStore().lastError).toMatch(/decrypt/i)
  })

  it('a push conflict sets status=conflict and stashes the current revision', async () => {
    const engine = makeEngine()
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 9999 }))
    await sync.unlock('pw')
    engine.pushLocal = vi.fn(async () => ({
      ok: false as const,
      conflict: true as const,
      currentRevision: 7,
    }))
    await sync.pushNow()
    const store = useSyncStore()
    expect(store.status).toBe('conflict')
    expect(store.currentRevision).toBe(7)
  })

  it('caches key material on unlock when rememberOnDevice is on, and auto-unlocks from it', async () => {
    const store = useSyncStore()
    store.setEnabled(true)
    store.setRememberOnDevice(true)
    // Engine reports a known salt as if a workspace already existed.
    const engine = makeEngine({
      currentSaltHex: '00112233445566778899aabbccddeeff',
      pullRemote: vi.fn(async () => ({ applied: false, revision: 0 })),
    })
    const sync = track(useSync({ createEngine: async () => engine, pollMs: 9999 }))
    await sync.unlock('pw')
    const km = store.keyMaterial
    expect(km).not.toBeNull()
    expect(km!.saltHex).toBe('00112233445566778899aabbccddeeff')
    expect(km!.authProofHex).toHaveLength(64)
    expect(km!.encKeyHex).toHaveLength(64)

    // A fresh useSync should auto-unlock from the cached material (no password).
    let materialUsed: unknown = null
    const sync2 = track(
      useSync({
        pollMs: 9999,
        createEngineFromMaterial: (material) => {
          materialUsed = material
          return makeEngine({ currentSaltHex: material.saltHex })
        },
      }),
    )
    const ok = await sync2.tryAutoUnlock()
    expect(ok).toBe(true)
    expect((materialUsed as { saltHex: string }).saltHex).toBe('00112233445566778899aabbccddeeff')
    expect(store.status).toBe('idle')
  })

  it('auto-detects a local edit and pushes it (change-timer must not starve the debounce)', async () => {
    // Regression: the 2s change-poll calling notifyChange every tick used to
    // reset the 4s debounce forever, so a pending edit never pushed. With a
    // fast change-check (10ms) + debounce (40ms), one edit must produce exactly
    // one push even though many checks see the still-pending change.
    const engine = makeEngine()
    const sync = track(
      useSync({
        createEngine: async () => engine,
        debounceMs: 40,
        changeCheckMs: 10,
        pollMs: 9999,
      }),
    )
    await sync.unlock('pw') // seeds once (push) + starts the auto loop
    ;(engine.pushLocal as ReturnType<typeof vi.fn>).mockClear()
    // A genuine local edit — the change-detector should pick it up on its own.
    localStorage.setItem('dormAssignments-guests', '["edited"]')
    await new Promise((r) => setTimeout(r, 200)) // >> several change-checks + the debounce
    expect(engine.pushLocal).toHaveBeenCalledTimes(1)
  })

  it('debounced auto-push fires once after several rapid local changes', async () => {
    // Real timers + a tiny debounce: the async snapshot hash (crypto.subtle)
    // doesn't resolve reliably under fake timers, so keep this deterministic.
    const engine = makeEngine()
    const sync = track(useSync({ createEngine: async () => engine, debounceMs: 20, pollMs: 9999 }))
    await sync.unlock('pw')
    // Unlock seeds a fresh workspace with one push — ignore that for this test.
    ;(engine.pushLocal as ReturnType<typeof vi.fn>).mockClear()
    // A real local change so the hash differs from what unlock recorded.
    localStorage.setItem('dormAssignments-guests', '["changed"]')
    sync.notifyChange()
    sync.notifyChange()
    sync.notifyChange()
    expect(engine.pushLocal).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 80))
    expect(engine.pushLocal).toHaveBeenCalledTimes(1)
  })
})
