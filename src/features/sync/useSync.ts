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
import { deriveAuth, deriveEncKeyHex, importEncKey, fromHex, DecryptError } from './crypto'
import { gatherSnapshot, hashSnapshot } from './snapshot'

export interface SyncEngineLike {
  currentSaltHex: string | null
  lastRevision: number
  setBaseRevision(revision: number): void
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
  changeCheckMs?: number
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
  const changeCheckMs = options.changeCheckMs ?? 2000

  let engine: SyncEngineLike | null = null
  // Held in memory after unlock so the workspace salt (minted on first push)
  // can be cached for "remember on this device". Never persisted.
  let password: string | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let changeTimer: ReturnType<typeof setInterval> | null = null
  let lastPushedHash = ''
  // The snapshot hash the change-detector saw on its previous tick. Used to
  // (re)start the debounce only on an actual change, never on a still-pending
  // one — otherwise the 2s poll would reset the 4s debounce forever and the
  // auto-push would never fire.
  let lastSeenHash = ''
  let focusHandler: (() => void) | null = null

  async function currentHash(): Promise<string> {
    return hashSnapshot(gatherSnapshot())
  }

  /**
   * Run a network op so failures never throw to the UI. A decrypt failure
   * (wrong password / tampered blob) is surfaced as 'error' with a clear
   * message; everything else degrades to 'offline'. Returns null on failure.
   */
  async function safeNetwork<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn()
    } catch (e) {
      if (e instanceof DecryptError) {
        store.setStatus('error')
        store.lastError = e.message
      } else {
        store.setStatus('offline')
        // Friendly, leak-free message (raw errors can contain the server URL).
        store.lastError = 'Network unavailable — your changes are saved on this device.'
      }
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

  /**
   * Pull the remote record and apply it. Reloads ONLY when the applied data
   * actually changed local state (so re-pulling identical data doesn't loop the
   * page). Returns true if a record existed, false on 404, null on failure.
   */
  async function pullAndApply(): Promise<boolean | null> {
    if (!engine) return null
    const before = await currentHash()
    const result = await safeNetwork(() => engine!.pullRemote())
    if (result === null) return null // offline / decrypt error — status already set
    store.currentRevision = engine.lastRevision
    if (result.applied) {
      const after = await currentHash()
      // Remote state is now our synced baseline — don't re-push it back.
      lastPushedHash = after
      store.lastSyncedAt = Date.now()
      store.setStatus('idle')
      if (after !== before) reload() // re-hydrate Pinia only if something changed
      return true
    }
    if (store.status === 'offline' || store.status === 'syncing') store.setStatus('idle')
    return false
  }

  /**
   * Bring a freshly-built engine online: pull/apply, seed a brand-new workspace
   * with local data, then start the live sync loop. Shared by unlock and
   * tryAutoUnlock.
   */
  async function bringOnline(): Promise<boolean> {
    const applied = await pullAndApply()
    if (applied === null) return false // offline; status set
    if (applied === false) {
      // No remote record yet — we're the first device. Seed our local data so
      // other devices can pull it (without this, nothing syncs until an edit).
      await pushNow()
    } else {
      await cacheIfRemembering()
    }
    startAuto() // begin auto-push (debounced) + auto-pull (focus/poll)
    return true
  }

  async function unlock(pw: string): Promise<boolean> {
    password = pw
    store.setStatus('syncing')
    try {
      // Pull happens inside bringOnline; deriveAuth here is deterministic so any
      // device finds the same workspace with no discovery step.
      engine = await createEngine(pw, store.serverUrl)
    } catch (e) {
      engine = null
      store.setStatus('error')
      store.lastError = String(e)
      return false
    }
    return bringOnline()
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
    return bringOnline()
  }

  /** Manual "Pull now" — explicit user intent, so always apply theirs. */
  async function pullNow(): Promise<void> {
    await pullAndApply()
  }

  /**
   * Background pull (focus/poll). Unlike a manual pull, this must NOT silently
   * overwrite unsynced local edits — if the local hash has diverged, push
   * instead so any real divergence surfaces as a conflict, not lost work.
   */
  async function autoPull(): Promise<void> {
    if (!engine) return
    if ((await currentHash()) !== lastPushedHash) {
      notifyChange()
      return
    }
    await pullAndApply()
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
      // Re-push local against the server's current revision (user-initiated).
      engine.setBaseRevision(store.currentRevision)
      await pushNow()
    }
  }

  function startAuto(): void {
    if (pollTimer) return // idempotent: already running (e.g. unlock + App mount)
    void autoPull()
    focusHandler = () => void autoPull()
    if (typeof window !== 'undefined') window.addEventListener('focus', focusHandler)
    pollTimer = setInterval(() => void autoPull(), pollMs)
    // Light poll of the snapshot hash so local edits trigger a debounced push
    // without wiring into every store's mutations. Only (re)debounce when the
    // hash CHANGED since the last tick — re-calling notifyChange every tick on a
    // still-pending edit would reset the debounce forever (starvation).
    changeTimer = setInterval(() => {
      void currentHash().then((h) => {
        if (h === lastSeenHash) return // no change since last check
        lastSeenHash = h
        if (h !== lastPushedHash) notifyChange()
      })
    }, changeCheckMs)
  }

  function stopAuto(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (pollTimer) clearInterval(pollTimer)
    if (changeTimer) clearInterval(changeTimer)
    if (focusHandler && typeof window !== 'undefined')
      window.removeEventListener('focus', focusHandler)
    debounceTimer = pollTimer = changeTimer = null
    lastSeenHash = ''
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
