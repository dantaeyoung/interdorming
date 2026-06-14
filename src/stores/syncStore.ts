/**
 * Sync Store
 *
 * Holds the cloud-sync configuration (persisted) and runtime status (not
 * persisted). Persisted under `dormAssignments-sync` — the SAME key the
 * snapshot module denylists (see src/features/sync/snapshot.ts), so the sync
 * config (server URL + optional cached key material) is NEVER itself encrypted
 * and pushed to the server.
 *
 * Key material is cached on this device ONLY when `rememberOnDevice` is true.
 * That is plaintext-on-device by design (the dorm data in localStorage is
 * already plaintext); the raw password is NEVER stored.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'conflict' | 'error' | 'locked'

export interface KeyMaterial {
  saltHex: string
  authProofHex: string
  encKeyHex: string
}

export const useSyncStore = defineStore(
  'sync',
  () => {
    // --- Persisted config ---
    const enabled = ref(false)
    const serverUrl = ref('')
    const rememberOnDevice = ref(false)
    const operatorName = ref('')
    // Persisted only while rememberOnDevice is true (see rememberKeyMaterial).
    const keyMaterial = ref<KeyMaterial | null>(null)

    // --- Runtime status (not persisted) ---
    const status = ref<SyncStatus>('idle')
    const lastSyncedAt = ref<number | null>(null)
    const lastError = ref<string | null>(null)
    const currentRevision = ref(0)

    function setStatus(s: SyncStatus) {
      status.value = s
    }
    function setEnabled(v: boolean) {
      enabled.value = v
    }
    function setRememberOnDevice(v: boolean) {
      rememberOnDevice.value = v
      // Turning remember off must drop any cached secrets immediately.
      if (!v) keyMaterial.value = null
    }
    function rememberKeyMaterial(m: KeyMaterial) {
      // Only cache when the operator opted in; otherwise keep it in-memory
      // elsewhere (the composable) and never let it reach the persisted blob.
      keyMaterial.value = rememberOnDevice.value ? m : null
    }
    function clearKeyMaterial() {
      keyMaterial.value = null
    }

    return {
      enabled,
      serverUrl,
      rememberOnDevice,
      operatorName,
      keyMaterial,
      status,
      lastSyncedAt,
      lastError,
      currentRevision,
      setStatus,
      setEnabled,
      setRememberOnDevice,
      rememberKeyMaterial,
      clearKeyMaterial,
    }
  },
  {
    persist: {
      key: 'dormAssignments-sync',
      // `pick` (not the v3 `paths`) is the v4 option name — only config and
      // opt-in key material persist; runtime status fields are never written.
      pick: ['enabled', 'serverUrl', 'rememberOnDevice', 'operatorName', 'keyMaterial'],
    },
  },
)
