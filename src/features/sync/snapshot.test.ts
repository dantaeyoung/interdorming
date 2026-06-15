import { describe, it, expect, beforeEach } from 'vitest'
import { gatherSnapshot, applySnapshot, hashSnapshot, SNAPSHOT_SCHEMA_VERSION } from './snapshot'
import { installLocalStorageMock } from './testLocalStorage'

installLocalStorageMock()
beforeEach(() => localStorage.clear())

describe('snapshot gather/apply', () => {
  it('gathers all dormAssignments-* keys except the sync config', () => {
    localStorage.setItem('dormAssignments-guests', '[1,2,3]')
    localStorage.setItem('dormAssignments-viewDate', '"2026-06-01"')
    localStorage.setItem('dormAssignments-sync', '{"serverUrl":"x"}') // must be excluded
    localStorage.setItem('unrelated-key', 'nope') // must be excluded
    const snap = gatherSnapshot()
    expect(snap.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION)
    expect(Object.keys(snap.data).sort()).toEqual([
      'dormAssignments-guests',
      'dormAssignments-viewDate',
    ])
  })

  it('applies a snapshot, replacing managed keys and leaving others alone', () => {
    localStorage.setItem('dormAssignments-guests', 'OLD')
    localStorage.setItem('dormAssignments-sync', 'KEEP')
    applySnapshot({
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      data: { 'dormAssignments-guests': 'NEW' },
    })
    expect(localStorage.getItem('dormAssignments-guests')).toBe('NEW')
    expect(localStorage.getItem('dormAssignments-sync')).toBe('KEEP')
  })
})

describe('hashSnapshot', () => {
  it('hashes equal snapshots equally and differs on change', async () => {
    const a = { schemaVersion: 1, data: { x: '1', y: '2' } }
    const b = { schemaVersion: 1, data: { y: '2', x: '1' } } // key order differs
    const c = { schemaVersion: 1, data: { x: '9', y: '2' } }
    expect(await hashSnapshot(a)).toBe(await hashSnapshot(b))
    expect(await hashSnapshot(a)).not.toBe(await hashSnapshot(c))
  })
})
