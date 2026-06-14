import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { createApp, nextTick } from 'vue'
import { useSyncStore } from './syncStore'
import { installLocalStorageMock } from '@/features/sync/testLocalStorage'

// Inject this exact storage into the persist plugin so writes are unambiguous
// (the plugin otherwise defaults to window.localStorage, which jsdom doesn't
// back reliably in this env).
const ls = installLocalStorageMock()

const SYNC_KEY = 'dormAssignments-sync'
function persisted(): Record<string, unknown> {
  const raw = localStorage.getItem(SYNC_KEY)
  return raw ? JSON.parse(raw) : {}
}

describe('syncStore', () => {
  beforeEach(() => {
    localStorage.clear()
    const pinia = createPinia()
    pinia.use(createPersistedState({ storage: ls }))
    // Pinia only applies plugins once it is installed into an app; without
    // this, pinia.use() plugins sit unapplied and nothing persists.
    createApp({}).use(pinia)
    setActivePinia(pinia)
  })

  it('persists config under the sync key when enabled toggles', async () => {
    const store = useSyncStore()
    store.setEnabled(true)
    store.serverUrl = 'https://sync.example'
    store.operatorName = 'Br. Phap'
    await nextTick()
    const blob = persisted()
    expect(blob.enabled).toBe(true)
    expect(blob.serverUrl).toBe('https://sync.example')
    expect(blob.operatorName).toBe('Br. Phap')
  })

  it('never persists key material when rememberOnDevice is false', async () => {
    const store = useSyncStore()
    store.setRememberOnDevice(false)
    store.rememberKeyMaterial({ saltHex: 'aa', authProofHex: 'bb', encKeyHex: 'cc' })
    await nextTick()
    expect(store.keyMaterial).toBeNull()
    const raw = localStorage.getItem(SYNC_KEY) ?? ''
    expect(raw).not.toContain('aa')
    expect(raw).not.toContain('bb')
    expect(raw).not.toContain('cc')
  })

  it('caches key material only while remembering, and drops it when turned off', async () => {
    const store = useSyncStore()
    store.setRememberOnDevice(true)
    store.rememberKeyMaterial({ saltHex: 'aa', authProofHex: 'bb', encKeyHex: 'cc' })
    expect(store.keyMaterial).toEqual({ saltHex: 'aa', authProofHex: 'bb', encKeyHex: 'cc' })
    await nextTick()
    expect(localStorage.getItem(SYNC_KEY) ?? '').toContain('aa')
    // Turning remember off must wipe the cached secrets immediately.
    store.setRememberOnDevice(false)
    await nextTick()
    expect(store.keyMaterial).toBeNull()
    expect(localStorage.getItem(SYNC_KEY) ?? '').not.toContain('aa')
  })

  it('status transitions are plain setters and are not persisted', async () => {
    const store = useSyncStore()
    store.setStatus('syncing')
    expect(store.status).toBe('syncing')
    store.setStatus('offline')
    expect(store.status).toBe('offline')
    await nextTick()
    expect('status' in persisted()).toBe(false)
  })
})
