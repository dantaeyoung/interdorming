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
