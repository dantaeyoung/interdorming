/**
 * overrideConflict warning surfaces on an assignment whose bed/room/dorm
 * becomes inactive during the guest's stay via a time-based override.
 * The bed stays assigned (per spec — non-blocking warning, operator
 * decides when to re-place).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGuestStore } from './guestStore'
import { useDormitoryStore } from './dormitoryStore'
import { useAssignmentStore } from './assignmentStore'
import { useSettingsStore } from './settingsStore'
import { useValidationStore } from './validationStore'

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
  useAssignmentStore().assignGuestToBed(guest.id, 'B01', true)
  return { guest, dorm }
}

describe('validationStore — overrideConflict warning', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    useSettingsStore().settings.warnings.genderMismatch = true
  })

  it('flags an assignment when a bed-level override closes the bed during the stay', () => {
    const { dorm } = seed()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'B01' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-12',
      effectiveTo: '2026-07-14',
    })
    const warnings = useValidationStore().getWarningsForBed('B01')
    expect(warnings.some(w => /inactive.*override/i.test(w))).toBe(true)
  })

  it('does NOT flag when override window is outside the stay', () => {
    const { dorm } = seed()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'B01' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-01',
      effectiveTo: '2026-08-15',
    })
    const warnings = useValidationStore().getWarningsForBed('B01')
    expect(warnings.some(w => /inactive.*override/i.test(w))).toBe(false)
  })

  it('flags when a dormitory-level override cascades to close the bed during the stay', () => {
    const { dorm } = seed()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Test Dorm' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-11',
      effectiveTo: '2026-07-13',
    })
    const warnings = useValidationStore().getWarningsForBed('B01')
    expect(warnings.some(w => /inactive.*override/i.test(w))).toBe(true)
  })

  it('does not unassign the guest — assignment persists despite the warning', () => {
    const { guest, dorm } = seed()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'B01' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-12',
      effectiveTo: '2026-07-14',
    })
    expect(useAssignmentStore().getAssignmentByGuest(guest.id)).toBe('B01')
  })
})
