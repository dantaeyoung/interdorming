/**
 * Tests for bedId uniqueness + the heal pass that fixes legacy
 * duplicate-bedId data caused by the pre-fix `addBed()` collision bug.
 *
 * Two rooms whose names share their first two characters (e.g.
 * "Mountain House" and "Mosquito Hall" → both `MO`) used to produce
 * colliding bed IDs. Since `assignmentStore.guestToBed` keys by
 * `bedId`, a colliding bed made one guest appear in two rooms.
 *
 * These tests cover:
 *  1. `useBedIdGenerator.generateUniqueBedId` resolves the collision
 *     scenario when seeded with already-taken IDs.
 *  2. `dormitoryStore.healDuplicateBedIds` renames duplicate bedIds
 *     and reports the renames.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDormitoryStore } from './dormitoryStore'
import { useBedIdGenerator } from '@/shared/composables/useBedIdGenerator'
import type { Dormitory } from '@/types'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    key: () => null,
    length: 0,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

if (typeof globalThis.crypto === 'undefined') {
  ;(globalThis as { crypto: Crypto }).crypto = {
    randomUUID: () => Math.random().toString(36).slice(2) as `${string}-${string}-${string}-${string}-${string}`,
  } as Crypto
} else if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = () =>
    Math.random().toString(36).slice(2) as `${string}-${string}-${string}-${string}-${string}`
}

describe('useBedIdGenerator.generateUniqueBedId', () => {
  const { generateBedId, generateUniqueBedId } = useBedIdGenerator()

  it('produces distinct prefixes under the v2 format for previously-colliding names', () => {
    // The v2 format takes 2 chars per word instead of 1, so the
    // pre-fix collision pairs no longer share a prefix.
    expect(generateBedId('Mountain House', 0)).toBe('MOHO-01')
    expect(generateBedId('Mosquito Hall', 0)).toBe('MOHA-01')
  })

  it('iterates the suffix to avoid a collision with existing IDs', () => {
    // Residual collisions still possible (e.g. names sharing first
    // 2 chars per word) — generator must iterate the suffix.
    const seed = ['MOHA-01', 'MOHA-02', 'MOHA-03']
    const next = generateUniqueBedId('Mosquito Hall', seed)
    expect(next).toBe('MOHA-04')
  })

  it('hands out the natural ID when nothing collides', () => {
    expect(generateUniqueBedId('Big Dorm', [])).toBe('BIDO-01')
    expect(generateUniqueBedId('Big Dorm', ['MAHA-01', 'FRRO-03'])).toBe('BIDO-01')
  })

  it('handles single-word names with first 4 chars', () => {
    expect(generateBedId('Library', 0)).toBe('LIBR-01')
    expect(generateBedId('Garden', 0)).toBe('GARD-01')
    expect(generateBedId('Hub', 0)).toBe('HUB-01') // shorter than 4
  })

  it('falls back to a placeholder prefix for empty/whitespace names', () => {
    expect(generateBedId('', 0)).toBe('RM-01')
    expect(generateBedId('   ', 0)).toBe('RM-01')
  })
})

describe('dormitoryStore.healDuplicateBedIds', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  function makeCollidingTree(): Dormitory[] {
    return [
      {
        dormitoryName: 'Main Building',
        active: true,
        rooms: [
          {
            roomName: 'Mountain House',
            roomGender: 'M',
            active: true,
            beds: [
              { bedId: 'MH01', bedType: 'single', position: 1, assignments: [] },
              { bedId: 'MH02', bedType: 'single', position: 2, assignments: [] },
            ],
          },
          {
            // Different room, same prefix → same generated IDs under
            // the pre-fix `addBed()` code path.
            roomName: 'Mosquito Hall',
            roomGender: 'F',
            active: true,
            beds: [
              { bedId: 'MH01', bedType: 'single', position: 1, assignments: [] },
              { bedId: 'MH02', bedType: 'single', position: 2, assignments: [] },
            ],
          },
        ],
      },
    ]
  }

  it('eager watcher heals duplicate bedIds at hydration time and records them on bedIdHealRenames', () => {
    const store = useDormitoryStore()
    // Importing into the empty store triggers the eager heal watcher,
    // which mirrors what happens at pinia-persistedstate hydration.
    store.importDormitories(makeCollidingTree())

    // All bedIds across the tree must be globally unique post-heal.
    const allBedIds = store.dormitories
      .flatMap(d => d.rooms)
      .flatMap(r => r.beds)
      .map(b => b.bedId)
    expect(new Set(allBedIds).size).toBe(allBedIds.length)

    // First occurrence keeps its ID; later duplicates are renamed.
    const mountainHouse = store.dormitories[0].rooms.find(r => r.roomName === 'Mountain House')!
    expect(mountainHouse.beds.map(b => b.bedId)).toEqual(['MH01', 'MH02'])

    // Renames are surfaced on the store for the dismissable banner.
    expect(store.bedIdHealRenames.length).toBeGreaterThanOrEqual(2)
    for (const r of store.bedIdHealRenames) {
      expect(r.roomName).toBe('Mosquito Hall')
      expect(r.dormitoryName).toBe('Main Building')
      expect(['MH01', 'MH02']).toContain(r.oldId)
      expect(r.newId).not.toBe(r.oldId)
    }
  })

  it('dismissBedIdHealNotice clears the rename list', () => {
    const store = useDormitoryStore()
    store.importDormitories(makeCollidingTree())
    expect(store.bedIdHealRenames.length).toBeGreaterThan(0)
    store.dismissBedIdHealNotice()
    expect(store.bedIdHealRenames).toEqual([])
  })

  it('explicit healDuplicateBedIds call dedupes new collisions introduced after hydration', () => {
    const store = useDormitoryStore()
    // First import is unique → eager watcher records nothing.
    store.importDormitories([
      {
        dormitoryName: 'Main Building',
        active: true,
        rooms: [
          {
            roomName: 'Alpha Room',
            roomGender: 'M',
            active: true,
            beds: [
              { bedId: 'AR01', bedType: 'single', position: 1, assignments: [] },
            ],
          },
        ],
      },
    ])
    expect(store.bedIdHealRenames).toEqual([])

    // Simulate a buggy add-bed path producing a duplicate.
    store.dormitories[0].rooms[0].beds.push({
      bedId: 'AR01',
      bedType: 'single',
      position: 2,
      assignments: [],
    })

    const renames = store.healDuplicateBedIds()
    expect(renames.length).toBe(1)
    expect(renames[0].oldId).toBe('AR01')
    expect(renames[0].newId).not.toBe('AR01')

    const ids = store.dormitories[0].rooms[0].beds.map(b => b.bedId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is a no-op on a tree that already has unique bedIds', () => {
    const store = useDormitoryStore()
    store.importDormitories([
      {
        dormitoryName: 'Main Building',
        active: true,
        rooms: [
          {
            roomName: 'Alpha Room',
            roomGender: 'M',
            active: true,
            beds: [
              { bedId: 'AR01', bedType: 'single', position: 1, assignments: [] },
              { bedId: 'AR02', bedType: 'single', position: 2, assignments: [] },
            ],
          },
        ],
      },
    ])

    const renames = store.healDuplicateBedIds()
    expect(renames).toEqual([])
  })
})
