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
