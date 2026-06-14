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
import { SyncEngine } from './engine'
import { SyncClient } from './client'
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
  reload?: () => void
  debounceMs?: number
  pollMs?: number
}

export function useSync(options: UseSyncOptions = {}) {
  const store = useSyncStore()
  const createEngine =
    options.createEngine ??
    (async (password: string, serverUrl: string) =>
      SyncEngine.create(password, new SyncClient(serverUrl)))
  const reload = options.reload ?? (() => location.reload())
  const debounceMs = options.debounceMs ?? 4000
  const pollMs = options.pollMs ?? 25000

  let engine: SyncEngineLike | null = null
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

  async function unlock(password: string): Promise<boolean> {
    store.setStatus('syncing')
    try {
      engine = await createEngine(password, store.serverUrl)
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
    store.setStatus('idle')
    if (result.applied) {
      store.lastSyncedAt = Date.now()
      reload() // re-hydrate Pinia from the freshly-applied snapshot
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

  return { unlock, pullNow, pushNow, notifyChange, resolveConflict, startAuto, stopAuto }
}
