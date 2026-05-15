/**
 * Tests for date-aware overlap detection on bed assignments — the
 * mechanism that lets two cohorts share a bed across non-overlapping
 * stays. Covers both the per-bed lookup (`getOverlappingAssignments`)
 * used by drop dialogs and the global scan (`getAllOverlapConflicts`)
 * used after CSV re-imports to surface bed-overlap regressions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGuestStore } from './guestStore'
import { useDormitoryStore } from './dormitoryStore'
import { useAssignmentStore } from './assignmentStore'
import type { Guest } from '@/types'

// localStorage stub for jsdom (Pinia persist plugin reaches for it on init)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
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

function seedDormWithOneBed(bedId = 'B01') {
  const dorm = useDormitoryStore()
  dorm.importDormitories([
    {
      dormitoryName: 'Test Dorm',
      active: true,
      rooms: [
        {
          roomName: 'Test Room',
          roomGender: 'M',
          active: true,
          beds: [{ bedId, bedType: 'single', position: 1, assignments: [] }],
        },
      ],
    },
  ])
  return bedId
}

function addGuestWithStay(
  firstName: string,
  arrival: string | undefined,
  departure: string | undefined,
  extras: Partial<Guest> = {}
): string {
  const guests = useGuestStore()
  const g = guests.addGuest({
    firstName,
    lastName: 'Test',
    gender: 'M',
    age: 30,
    arrival,
    departure,
    ...extras,
  })
  return g.id
}

describe('assignmentStore date-aware overlap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  describe('getOverlappingAssignments', () => {
    it('returns empty when bed is empty', () => {
      const bedId = seedDormWithOneBed()
      const candidate: Guest = {
        id: 'g-x',
        firstName: 'Casey',
        lastName: 'Test',
        gender: 'M',
        age: 30,
        arrival: '2026-05-10',
        departure: '2026-05-15',
      }
      const assign = useAssignmentStore()
      expect(assign.getOverlappingAssignments(bedId, candidate)).toEqual([])
    })

    it('returns empty when bed is unknown', () => {
      seedDormWithOneBed()
      const candidate: Guest = {
        id: 'g-x',
        firstName: 'Casey',
        lastName: 'Test',
        gender: 'M',
        age: 30,
      }
      const assign = useAssignmentStore()
      expect(assign.getOverlappingAssignments('NO-SUCH-BED', candidate)).toEqual([])
    })

    it('returns the existing guestId when stays overlap', () => {
      const bedId = seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, bedId, true)

      const guests = useGuestStore()
      const bob: Guest = {
        ...guests.guests[0],
        id: 'g-bob',
        firstName: 'Bob',
        arrival: '2026-05-12',
        departure: '2026-05-18',
      }
      expect(assign.getOverlappingAssignments(bedId, bob)).toEqual([aliceId])
    })

    it('returns empty when stays are back-to-back (departure == arrival)', () => {
      const bedId = seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, bedId, true)

      const guests = useGuestStore()
      const bob: Guest = {
        ...guests.guests[0],
        id: 'g-bob',
        firstName: 'Bob',
        arrival: '2026-05-15',
        departure: '2026-05-20',
      }
      expect(assign.getOverlappingAssignments(bedId, bob)).toEqual([])
    })

    it('does not flag the guest against themselves', () => {
      const bedId = seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, bedId, true)

      const alice = useGuestStore().guests[0]
      expect(assign.getOverlappingAssignments(bedId, alice)).toEqual([])
    })
  })

  describe('getAllOverlapConflicts', () => {
    it('returns empty when no bed has multiple assignments', () => {
      seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, 'B01', true)
      expect(assign.getAllOverlapConflicts()).toEqual([])
    })

    it('returns empty when sharing cohorts have non-overlapping stays', () => {
      seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const bobId = addGuestWithStay('Bob', '2026-05-15', '2026-05-20')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, 'B01', true)
      assign.assignGuestToBed(bobId, 'B01', true)
      expect(assign.getAllOverlapConflicts()).toEqual([])
    })

    it('reports bed and both guests when their stays overlap', () => {
      seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const bobId = addGuestWithStay('Bob', '2026-05-12', '2026-05-18')
      const assign = useAssignmentStore()
      assign.assignGuestToBed(aliceId, 'B01', true)
      assign.assignGuestToBed(bobId, 'B01', true)

      const conflicts = assign.getAllOverlapConflicts()
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].bedId).toBe('B01')
      expect(conflicts[0].guests.map(g => g.guestId).sort()).toEqual(
        [aliceId, bobId].sort()
      )
    })
  })

  describe('assignGuestToBed with displaceOverlapping', () => {
    it('silently shares the bed when stays do not overlap', () => {
      seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const bobId = addGuestWithStay('Bob', '2026-05-15', '2026-05-20')
      const assign = useAssignmentStore()

      assign.assignGuestToBed(aliceId, 'B01', true)
      assign.assignGuestToBed(bobId, 'B01', true, true)

      const dorm = useDormitoryStore()
      const bed = dorm.getBedById('B01')!
      expect(bed.assignments.map(a => a.guestId).sort()).toEqual(
        [aliceId, bobId].sort()
      )
      expect(assign.assignments.get(aliceId)).toBe('B01')
      expect(assign.assignments.get(bobId)).toBe('B01')
    })

    it('displaces the overlapping occupant when displaceOverlapping is true', () => {
      seedDormWithOneBed()
      const aliceId = addGuestWithStay('Alice', '2026-05-10', '2026-05-15')
      const bobId = addGuestWithStay('Bob', '2026-05-12', '2026-05-18')
      const assign = useAssignmentStore()

      assign.assignGuestToBed(aliceId, 'B01', true)
      assign.assignGuestToBed(bobId, 'B01', true, true)

      const dorm = useDormitoryStore()
      const bed = dorm.getBedById('B01')!
      expect(bed.assignments.map(a => a.guestId)).toEqual([bobId])
      expect(assign.assignments.has(aliceId)).toBe(false)
      expect(assign.assignments.get(bobId)).toBe('B01')
    })
  })
})
