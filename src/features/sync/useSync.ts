/**
 * useSync — orchestration layer over SyncEngine.
 *
 * Guarantees the app stays usable no matter what the network does: every
 * network call is wrapped so a rejection sets status='offline' and never
 * throws to the UI. localStorage remains the source of truth.
 *
 * Re-hydration after a pull: applySnapshot (inside the engine) writes
 * localStorage, but the in-memory Pinia stores are now stale. The safe default
 * is a full page reload (injectable for tests); $hydrate() per store is the
 * heavier-but-smoother future optimization.
 */
import { useSyncStore } from '@/stores/syncStore'
import { SyncEngine, type CachedMaterial } from './engine'
import { SyncClient } from './client'
import { deriveAuth, deriveEncKeyHex, importEncKey, fromHex } from './crypto'
import { gatherSnapshot, hashSnapshot } from './snapshot'

export interface SyncEngineLike {
  currentSaltHex: string | null
  lastRevision: number
  pullRemote(): Promise<{ applied: boolean; revision: number }>
  pushLocal(): Promise<
    { ok: true; revision: number } | { ok: false; conflict: true; currentRevision: number }
  >
}

export interface UseSyncOptions {
  createEngine?: (password: string, serverUrl: string) => Promise<SyncEngineLike>
  createEngineFromMaterial?: (material: CachedMaterial, serverUrl: string) => SyncEngineLike
  reload?: () => void
  debounceMs?: number
  pollMs?: number
}

export function useSync(options: UseSyncOptions = {}) {
  const store = useSyncStore()
  const createEngine =
    options.createEngine ??
    (async (password: string, serverUrl: string) =>
      SyncEngine.fromPassword(password, new SyncClient(serverUrl)))
  const createEngineFromMaterial =
    options.createEngineFromMaterial ??
    ((material: CachedMaterial, serverUrl: string) =>
      SyncEngine.fromMaterial(material, new SyncClient(serverUrl)))
  const reload = options.reload ?? (() => location.reload())
  const debounceMs = options.debounceMs ?? 4000
  const pollMs = options.pollMs ?? 25000

  let engine: SyncEngineLike | null = null
  // Held in memory after unlock so the workspace salt (minted on first push)
  // can be cached for "remember on this device". Never persisted.
  let password: string | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let changeTimer: ReturnType<typeof setInterval> | null = null
  let lastPushedHash = ''
  let focusHandler: (() => void) | null = null

  async function currentHash(): Promise<string> {
    return hashSnapshot(gatherSnapshot())
  }

  /** Run a network op so failures degrade to offline instead of throwing. */
  async function safeNetwork<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn()
    } catch (e) {
      store.setStatus('offline')
      store.lastError = String(e)
      return null
    }
  }

  /** Cache derived key material so a remembered device can auto-unlock later. */
  async function cacheIfRemembering(): Promise<void> {
    if (!store.rememberOnDevice || !password || !engine?.currentSaltHex) return
    const saltHex = engine.currentSaltHex
    const { authProofHex } = await deriveAuth(password)
    const encKeyHex = await deriveEncKeyHex(password, fromHex(saltHex))
    store.rememberKeyMaterial({ saltHex, authProofHex, encKeyHex })
  }

  async function unlock(pw: string): Promise<boolean> {
    password = pw
    store.setStatus('syncing')
    try {
      engine = await createEngine(pw, store.serverUrl)
    } catch (e) {
      engine = null
      store.setStatus('error')
      store.lastError = String(e)
      return false
    }
    // Pull FIRST: discovers an existing workspace + its salt before we ever
    // mint one. A 404 (applied:false) just means we're the first device.
    const result = await safeNetwork(() => engine!.pullRemote())
    if (result === null) return false // offline; status already set
    store.currentRevision = engine.lastRevision
    lastPushedHash = await currentHash()
    await cacheIfRemembering()
    store.setStatus('idle')
    if (result.applied) {
      store.lastSyncedAt = Date.now()
      reload() // re-hydrate Pinia from the freshly-applied snapshot
    }
    return true
  }

  /** Auto-unlock at app start from cached material (no password prompt). */
  async function tryAutoUnlock(): Promise<boolean> {
    const km = store.keyMaterial
    if (!store.enabled || !km) return false
    store.setStatus('syncing')
    let encKey: CryptoKey
    try {
      encKey = await importEncKey(km.encKeyHex)
    } catch (e) {
      store.setStatus('error')
      store.lastError = String(e)
      return false
    }
    engine = createEngineFromMaterial(
      { authProofHex: km.authProofHex, saltHex: km.saltHex, encKey },
      store.serverUrl,
    )
    const result = await safeNetwork(() => engine!.pullRemote())
    if (result === null) return false
    store.currentRevision = engine.lastRevision
    lastPushedHash = await currentHash()
    store.setStatus('idle')
    if (result.applied) {
      store.lastSyncedAt = Date.now()
      reload()
    }
    return true
  }

  async function pullNow(): Promise<void> {
    if (!engine) return
    const result = await safeNetwork(() => engine!.pullRemote())
    if (result === null) return // offline
    store.currentRevision = engine.lastRevision
    if (result.applied) {
      store.lastSyncedAt = Date.now()
      store.setStatus('idle')
      reload()
    } else if (store.status === 'offline' || store.status === 'syncing') {
      store.setStatus('idle')
    }
  }

  async function pushNow(): Promise<void> {
    if (!engine) return
    store.setStatus('syncing')
    const result = await safeNetwork(() => engine!.pushLocal())
    if (result === null) return // offline
    if (result.ok) {
      store.currentRevision = result.revision
      lastPushedHash = await currentHash()
      store.lastSyncedAt = Date.now()
      // First push mints the workspace salt — cache it now if remembering.
      await cacheIfRemembering()
      store.setStatus('idle')
    } else {
      // The seatbelt: someone else wrote first. Never auto-overwrite.
      store.currentRevision = result.currentRevision
      store.setStatus('conflict')
    }
  }

  /** Schedule a debounced push; the hash guard runs at fire time. */
  function notifyChange(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void maybePush(), debounceMs)
  }

  async function maybePush(): Promise<void> {
    if (!engine) return
    const hash = await currentHash()
    if (hash === lastPushedHash) return // nothing actually changed
    await pushNow()
  }

  /**
   * Resolve a 409 conflict surfaced in the banner.
   * - 'reload'   → pull theirs (applies + reloads).
   * - 'overwrite'→ re-push local against the server's current revision.
   */
  async function resolveConflict(choice: 'reload' | 'overwrite'): Promise<void> {
    if (!engine) return
    if (choice === 'reload') {
      await pullNow()
    } else {
      engine.lastRevision = store.currentRevision
      await pushNow()
    }
  }

  function startAuto(): void {
    void pullNow()
    focusHandler = () => void pullNow()
    if (typeof window !== 'undefined') window.addEventListener('focus', focusHandler)
    pollTimer = setInterval(() => void pullNow(), pollMs)
    // Light poll of the snapshot hash so local edits trigger a debounced push
    // without wiring into every store's mutations.
    changeTimer = setInterval(() => {
      void currentHash().then((h) => {
        if (h !== lastPushedHash) notifyChange()
      })
    }, 2000)
  }

  function stopAuto(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (pollTimer) clearInterval(pollTimer)
    if (changeTimer) clearInterval(changeTimer)
    if (focusHandler && typeof window !== 'undefined')
      window.removeEventListener('focus', focusHandler)
    debounceTimer = pollTimer = changeTimer = null
    focusHandler = null
  }

  return {
    unlock,
    tryAutoUnlock,
    pullNow,
    pushNow,
    notifyChange,
    resolveConflict,
    startAuto,
    stopAuto,
  }
}

// Single app-wide instance so the Settings panel, status chip, conflict banner,
// and the auto loop all share ONE engine (same singleton idea as useDragDrop).
// Tests bypass this and call useSync({...}) directly with injected deps.
let shared: ReturnType<typeof useSync> | null = null
export function useSharedSync(): ReturnType<typeof useSync> {
  if (!shared) shared = useSync()
  return shared
}
