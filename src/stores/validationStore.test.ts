/**
 * Tests for cohort-scoped bed warnings.
 *
 * A bed can hold multiple cohorts via date-aware sharing. A warning
 * intrinsic to one cohort's guest (e.g. "M guest in F room") must not
 * surface on a different cohort's guest when the slot displays them.
 * Regression guard for the "M in Female room" report against a guest
 * who is actually female — the warning belonged to her bed-sharer.
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

/**
 * Female room, one bed, shared by two non-overlapping cohorts:
 *   - Phyllis (F), March
 *   - Mark (M),    April
 * Mark in a Female room is a real gender mismatch — but it must be
 * attributed to Mark, not to Phyllis.
 */
function seedSharedFemaleRoomBed() {
  const guests = useGuestStore()
  const phyllis = guests.addGuest({
    firstName: 'Phyllis', lastName: 'Chen', gender: 'F', age: 45,
    arrival: '2026-03-10', departure: '2026-03-15',
  })
  const mark = guests.addGuest({
    firstName: 'Mark', lastName: 'Doe', gender: 'M', age: 50,
    arrival: '2026-04-10', departure: '2026-04-15',
  })

  const dorm = useDormitoryStore()
  dorm.importDormitories([
    {
      dormitoryName: 'Test Dorm',
      active: true,
      rooms: [
        {
          roomName: 'Female Room',
          roomGender: 'F',
          active: true,
          beds: [{ bedId: 'FR01', bedType: 'single', position: 1, assignments: [] }],
        },
      ],
    },
  ])

  const assign = useAssignmentStore()
  assign.assignGuestToBed(phyllis.id, 'FR01', true)
  assign.assignGuestToBed(mark.id, 'FR01', true)

  return { phyllisId: phyllis.id, markId: mark.id }
}

describe('validationStore — cohort-scoped bed warnings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    // Gender-mismatch warnings are opt-in via settings; ensure on.
    useSettingsStore().settings.warnings.genderMismatch = true
  })

  it('does NOT show the male bed-sharer\'s gender warning on the female guest\'s slot', () => {
    const { phyllisId } = seedSharedFemaleRoomBed()
    const validation = useValidationStore()

    const warnings = validation.getWarningsForBed('FR01', phyllisId)
    expect(warnings.some(w => /guest in F room/.test(w))).toBe(false)
  })

  it('DOES show the gender warning when the male guest is the displayed cohort', () => {
    const { markId } = seedSharedFemaleRoomBed()
    const validation = useValidationStore()

    const warnings = validation.getWarningsForBed('FR01', markId)
    expect(warnings.some(w => /M guest in F room/.test(w))).toBe(true)
  })

  it('unscoped call still reports every cohort (used by getAllWarnings)', () => {
    seedSharedFemaleRoomBed()
    const validation = useValidationStore()

    const warnings = validation.getWarningsForBed('FR01')
    expect(warnings.some(w => /M guest in F room/.test(w))).toBe(true)
  })

  it('does not report a date conflict between non-overlapping cohorts', () => {
    const { phyllisId } = seedSharedFemaleRoomBed()
    const validation = useValidationStore()

    // March and April stays don't overlap — sharing the bed is legal.
    const warnings = validation.getWarningsForBed('FR01', phyllisId)
    expect(warnings.some(w => /Date conflict/.test(w))).toBe(false)
  })
})
