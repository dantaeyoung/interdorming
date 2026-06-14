import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createApp } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSync } from './useSync'
import { installLocalStorageMock } from './testLocalStorage'

installLocalStorageMock()

interface FakeEngine {
  currentSaltHex: string | null
  lastRevision: number
  pullRemote: () => Promise<{ applied: boolean; revision: number }>
  pushLocal: () => Promise<
    { ok: true; revision: number } | { ok: false; conflict: true; currentRevision: number }
  >
}

function makeEngine(overrides: Partial<FakeEngine> = {}): FakeEngine {
  return {
    currentSaltHex: null,
    lastRevision: 0,
    pullRemote: vi.fn(async () => ({ applied: false, revision: 0 })),
    pushLocal: vi.fn(async () => ({ ok: true as const, revision: 1 })),
    ...overrides,
  }
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
    vi.useRealTimers()
  })

  it('unlock pulls first (to discover an existing salt) before any push', async () => {
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
    const sync = useSync({ createEngine: async () => engine })
    await sync.unlock('pw')
    expect(calls).toEqual(['pull'])
    expect(useSyncStore().status).toBe('idle')
  })

  it('a rejected pull sets status=offline and never throws', async () => {
    const engine = makeEngine()
    const sync = useSync({ createEngine: async () => engine })
    await sync.unlock('pw')
    engine.pullRemote = vi.fn(async () => {
      throw new Error('network down')
    })
    await expect(sync.pullNow()).resolves.toBeUndefined()
    expect(useSyncStore().status).toBe('offline')
  })

  it('a push conflict sets status=conflict and stashes the current revision', async () => {
    const engine = makeEngine()
    const sync = useSync({ createEngine: async () => engine })
    await sync.unlock('pw')
    engine.pushLocal = vi.fn(async () => ({ ok: false as const, conflict: true as const, currentRevision: 7 }))
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
    const sync = useSync({ createEngine: async () => engine })
    await sync.unlock('pw')
    const km = store.keyMaterial
    expect(km).not.toBeNull()
    expect(km!.saltHex).toBe('00112233445566778899aabbccddeeff')
    expect(km!.authProofHex).toHaveLength(64)
    expect(km!.encKeyHex).toHaveLength(64)

    // A fresh useSync should auto-unlock from the cached material (no password).
    let materialUsed: unknown = null
    const sync2 = useSync({
      createEngineFromMaterial: (material) => {
        materialUsed = material
        return makeEngine({ currentSaltHex: material.saltHex })
      },
    })
    const ok = await sync2.tryAutoUnlock()
    expect(ok).toBe(true)
    expect((materialUsed as { saltHex: string }).saltHex).toBe('00112233445566778899aabbccddeeff')
    expect(store.status).toBe('idle')
  })

  it('debounced auto-push fires once after several rapid local changes', async () => {
    // Real timers + a tiny debounce: the async snapshot hash (crypto.subtle)
    // doesn't resolve reliably under fake timers, so keep this deterministic.
    const engine = makeEngine()
    const sync = useSync({ createEngine: async () => engine, debounceMs: 20 })
    await sync.unlock('pw')
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
