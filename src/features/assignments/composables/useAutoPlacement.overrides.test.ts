/**
 * Override-aware availability tests for auto-placement.
 *
 * `isBedAvailableForGuest` / `isBedAvailableForGroup` must reject a
 * bed when a time-based override leaves it inactive during the
 * candidate's stay window — even when the base config has the bed
 * active and no other guest is assigned to it.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAutoPlacement } from './useAutoPlacement'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'

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

function seedSingleBed(bedId = 'B01') {
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

describe('auto-placement — override-aware availability', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('skips a bed closed by override during the candidate\'s stay', () => {
    const bedId = seedSingleBed()
    const dorm = useDormitoryStore()
    dorm.addOverride({
      target: { kind: 'bed', bedId },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
    })
    const guest = useGuestStore().addGuest({
      firstName: 'Alice',
      lastName: 'T',
      gender: 'M',
      age: 30,
      arrival: '2026-07-10',
      departure: '2026-07-15',
      indivGrp: 'individual',
    })

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()
    expect(result.suggestions.has(guest.id)).toBe(false)
  })

  it('places the same guest when their stay falls outside the override window', () => {
    const bedId = seedSingleBed()
    const dorm = useDormitoryStore()
    dorm.addOverride({
      target: { kind: 'bed', bedId },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
    })
    const guest = useGuestStore().addGuest({
      firstName: 'Bob',
      lastName: 'T',
      gender: 'M',
      age: 30,
      arrival: '2026-08-05',
      departure: '2026-08-10',
      indivGrp: 'individual',
    })

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()
    expect(result.suggestions.get(guest.id)).toBe(bedId)
  })

  it('respects a dormitory-level close cascading down to the bed', () => {
    const bedId = seedSingleBed()
    const dorm = useDormitoryStore()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Test Dorm' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    const guest = useGuestStore().addGuest({
      firstName: 'Carlos',
      lastName: 'T',
      gender: 'M',
      age: 30,
      arrival: '2026-07-06',
      departure: '2026-07-09',
      indivGrp: 'individual',
    })

    const { autoPlaceGuests } = useAutoPlacement()
    const result = autoPlaceGuests()
    expect(result.suggestions.has(guest.id)).toBe(false)
  })
})
