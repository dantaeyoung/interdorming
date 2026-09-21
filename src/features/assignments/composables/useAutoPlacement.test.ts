/**
 * Auto-placement is date-aware: a March guest can be suggested onto a
 * bed that an April guest already holds. These tests pin that behavior
 * via the public API so future refactors of the multi-pass algorithm
 * can't silently regress to the pre-multi-assignment shape.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAutoPlacement } from './useAutoPlacement'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import type { Guest, GuestInput } from '@/types'

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

function seedSingleBedDorm(bedId = 'B01') {
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

function addGuest(
  firstName: string,
  arrival: string,
  departure: string,
  extras: Partial<GuestInput> = {}
): Guest {
  return useGuestStore().addGuest({
    firstName,
    lastName: 'Test',
    gender: 'M',
    age: 30,
    arrival,
    departure,
    indivGrp: 'individual',
    ...extras,
  })
}

describe('useAutoPlacement — date-aware bed availability', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('suggests a non-overlapping guest onto a bed already held by another', () => {
    const bedId = seedSingleBedDorm()
    const alice = addGuest('Alice', '2026-03-10', '2026-03-15')
    const bob = addGuest('Bob', '2026-04-10', '2026-04-15')

    // Pre-assign Alice; bed now has one assignment for March.
    const assign = useAssignmentStore()
    assign.assignGuestToBed(alice.id, bedId, true)

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()

    // Bob's April stay does not overlap Alice's, so the bed is still
    // "available for guest" and auto-place should land Bob there.
    expect(result.suggestions.get(bob.id)).toBe(bedId)
    expect(result.unplaceableGroups.find(g => g.groupName === 'Bob Test')).toBeUndefined()
  })

  it('does NOT suggest an overlapping guest onto an already-held bed', () => {
    const bedId = seedSingleBedDorm()
    const alice = addGuest('Alice', '2026-03-10', '2026-03-15')
    const bob = addGuest('Bob', '2026-03-12', '2026-03-18')

    const assign = useAssignmentStore()
    assign.assignGuestToBed(alice.id, bedId, true)

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()

    // Bob overlaps Alice on the only bed → no suggestion produced.
    expect(result.suggestions.has(bob.id)).toBe(false)
  })

  it('treats back-to-back stays (departure == arrival) as non-overlapping', () => {
    const bedId = seedSingleBedDorm()
    const alice = addGuest('Alice', '2026-05-10', '2026-05-15')
    const bob = addGuest('Bob', '2026-05-15', '2026-05-20')

    const assign = useAssignmentStore()
    assign.assignGuestToBed(alice.id, bedId, true)

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()

    expect(result.suggestions.get(bob.id)).toBe(bedId)
  })

  it('treats a guest with missing dates as conflicting (always-present)', () => {
    const bedId = seedSingleBedDorm()
    const alice = addGuest('Alice', '2026-05-10', '2026-05-15')
    // Bob has no dates → "always present" per staysOverlap contract.
    const bob = useGuestStore().addGuest({
      firstName: 'Bob',
      lastName: 'Test',
      gender: 'M',
      age: 30,
      indivGrp: 'individual',
    })

    const assign = useAssignmentStore()
    assign.assignGuestToBed(alice.id, bedId, true)

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()

    expect(result.suggestions.has(bob.id)).toBe(false)
  })
})

/**
 * Auto-place honors the Table View "View Date" filter.
 *
 * Without this scoping, auto-place considered every unassigned guest in
 * the data regardless of the picker — so with the filter on Sep 23 it
 * would suggest beds for a guest staying Jun 19–21, silently consuming
 * a bed the operator can't even see on screen.
 */
describe('useAutoPlacement — View Date scoping', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('ignores guests whose stay does not cover the view date', () => {
    seedSingleBedDorm()
    const june = addGuest('June', '2026-06-19', '2026-06-21')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(new Date(2026, 8, 23)) // Sep 23

    expect(result.suggestions.get(june.id)).toBeUndefined()
    expect(result.candidateCount).toBe(0)
  })

  it('places a guest whose stay covers the view date', () => {
    const bedId = seedSingleBedDorm()
    const sept = addGuest('Sept', '2026-09-23', '2026-09-27')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(new Date(2026, 8, 23))

    expect(result.suggestions.get(sept.id)).toBe(bedId)
    expect(result.candidateCount).toBe(1)
  })

  it('picks only the on-date guest when both are unassigned', () => {
    const bedId = seedSingleBedDorm()
    const june = addGuest('June', '2026-06-19', '2026-06-21')
    const sept = addGuest('Sept', '2026-09-23', '2026-09-27')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(new Date(2026, 8, 23))

    expect(result.suggestions.get(sept.id)).toBe(bedId)
    expect(result.suggestions.get(june.id)).toBeUndefined()
    expect(result.candidateCount).toBe(1)
  })

  it('considers everyone when no view date is set', () => {
    seedSingleBedDorm()
    addGuest('June', '2026-06-19', '2026-06-21')
    addGuest('Sept', '2026-09-23', '2026-09-27')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(null)

    expect(result.candidateCount).toBe(2)
  })

  it('treats the departure day as no longer present', () => {
    seedSingleBedDorm()
    const g = addGuest('Leaving', '2026-09-20', '2026-09-23')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(new Date(2026, 8, 23)) // departure day

    expect(result.suggestions.get(g.id)).toBeUndefined()
  })

  it('still includes guests with missing dates', () => {
    const bedId = seedSingleBedDorm()
    const g = addGuest('NoDates', '', '')

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests(new Date(2026, 8, 23))

    expect(result.suggestions.get(g.id)).toBe(bedId)
  })

  it('scopes the per-room button too', () => {
    seedSingleBedDorm()
    const june = addGuest('June', '2026-06-19', '2026-06-21')

    const dorm = useDormitoryStore()
    const room = dorm.dormitories[0].rooms[0]

    const { autoPlaceGuestsInRoom } = useAutoPlacement()
    expect(autoPlaceGuestsInRoom(room, new Date(2026, 8, 23)).size).toBe(0)
    // ...and still works with no date filter
    expect(autoPlaceGuestsInRoom(room, null).get(june.id)).toBeDefined()
  })
})
