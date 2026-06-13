/**
 * Drop validation must reject a drop when the bed is closed by a
 * time-based override during the guest's stay, even if all other
 * checks (gender, bunk) pass.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDropValidation } from './useDropValidation'
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

function seed() {
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
          beds: [{ bedId: 'B01', bedType: 'single', position: 1, assignments: [] }],
        },
      ],
    },
  ])
  const guest = useGuestStore().addGuest({
    firstName: 'Alice',
    lastName: 'T',
    gender: 'M',
    age: 30,
    arrival: '2026-07-10',
    departure: '2026-07-15',
    indivGrp: 'individual',
  })
  return { guest, dorm }
}

describe('useDropValidation — override-aware', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('rejects a drop on a bed closed by override during the stay', () => {
    const { guest, dorm } = seed()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'B01' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
    })
    const { validateDrop } = useDropValidation()
    const result = validateDrop(guest.id, 'B01')
    expect(result.isValid).toBe(false)
    expect(result.reason).toMatch(/inactive|override/i)
  })

  it('accepts a drop when the stay falls outside the override window', () => {
    const { guest, dorm } = seed()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'B01' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-01',
      effectiveTo: '2026-08-31',
    })
    const { validateDrop } = useDropValidation()
    expect(validateDrop(guest.id, 'B01').isValid).toBe(true)
  })

  it('rejects a drop on a bed inside a dormitory closed by override', () => {
    const { guest, dorm } = seed()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Test Dorm' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    const { validateDrop } = useDropValidation()
    const result = validateDrop(guest.id, 'B01')
    expect(result.isValid).toBe(false)
  })
})
