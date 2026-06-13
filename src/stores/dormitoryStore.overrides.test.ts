/**
 * Tests for time-based room configuration overrides.
 *
 * Covers `dormitoriesAt(date)` resolution (including cascade + exception
 * wins), `isBedActiveDuringStay` over a stay window, gender overrides,
 * and the preset apply/revert lifecycle. See `specs/TimeBasedRoomConfig.md`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDormitoryStore } from './dormitoryStore'

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
 * Two dorms, two rooms each. Maple Hall is mixed-gender (room A is M,
 * room B is F). Pine Cabin has a single coed family room.
 */
function seedBaseTree() {
  const dorm = useDormitoryStore()
  dorm.importDormitories([
    {
      dormitoryName: 'Maple Hall',
      active: true,
      rooms: [
        {
          roomName: 'Room A',
          roomGender: 'M',
          active: true,
          beds: [
            { bedId: 'MA1', bedType: 'lower', assignments: [], position: 1 },
            { bedId: 'MA2', bedType: 'upper', assignments: [], position: 2 },
          ],
        },
        {
          roomName: 'Room B',
          roomGender: 'F',
          active: true,
          beds: [
            { bedId: 'MB1', bedType: 'single', assignments: [], position: 1 },
          ],
        },
      ],
    },
    {
      dormitoryName: 'Pine Cabin',
      active: true,
      rooms: [
        {
          roomName: 'Family Room',
          roomGender: 'Coed',
          active: true,
          beds: [
            { bedId: 'PF1', bedType: 'single', assignments: [], position: 1 },
            { bedId: 'PF2', bedType: 'single', assignments: [], position: 2 },
          ],
        },
      ],
    },
  ])
  return dorm
}

describe('dormitoryStore.dormitoriesAt — base passthrough', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('with no overrides returns the base tree unchanged', () => {
    const dorm = seedBaseTree()
    const result = dorm.dormitoriesAt(null)
    expect(result).toEqual(dorm.dormitories)
  })

  it('with no overrides at a date returns the same shape as base', () => {
    const dorm = seedBaseTree()
    const result = dorm.dormitoriesAt('2026-07-01')
    expect(result.length).toBe(2)
    expect(result[0].rooms[0].active).toBe(true)
  })
})

describe('dormitoryStore.dormitoriesAt — cascade resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('closing a dormitory cascades to its rooms and beds', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })

    const inWindow = dorm.dormitoriesAt('2026-07-06')
    const maple = inWindow.find(d => d.dormitoryName === 'Maple Hall')!
    expect(maple.active).toBe(false)
    expect(maple.rooms.every(r => !r.active)).toBe(true)
    expect(maple.rooms.flatMap(r => r.beds).every(b => b.active === false)).toBe(true)

    // Outside the window, base is restored.
    const outside = dorm.dormitoriesAt('2026-08-01')
    expect(outside.find(d => d.dormitoryName === 'Maple Hall')!.active).toBe(true)
  })

  it('room-level exception wins over a dorm-close cascade', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    dorm.addOverride({
      target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
      change: { attr: 'active', value: true },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })

    const result = dorm.dormitoriesAt('2026-07-06')
    const maple = result.find(d => d.dormitoryName === 'Maple Hall')!
    // Dorm bubbles back to active so iteration finds the exception room.
    expect(maple.active).toBe(true)
    expect(maple.rooms.find(r => r.roomName === 'Room A')!.active).toBe(true)
    expect(maple.rooms.find(r => r.roomName === 'Room B')!.active).toBe(false)
  })

  it('bed-level exception wins over a room-close cascade', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
    })
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: true },
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
    })

    const result = dorm.dormitoriesAt('2026-09-01')
    const roomA = result[0].rooms.find(r => r.roomName === 'Room A')!
    expect(roomA.active).toBe(true)
    expect(roomA.beds.find(b => b.bedId === 'MA1')!.active).toBe(true)
    expect(roomA.beds.find(b => b.bedId === 'MA2')!.active).toBe(false)
  })

  it('most-recent override wins among same-target same-attr conflicts', async () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    // tiny delay so createdAt differs
    await new Promise(r => setTimeout(r, 5))
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: true },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })

    const result = dorm.dormitoriesAt('2026-07-06')
    const bed = result[0].rooms[0].beds.find(b => b.bedId === 'MA1')!
    expect(bed.active).toBe(true)
  })
})

describe('dormitoryStore.dormitoriesAt — gender override', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('changes a room\'s effective gender within the window only', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
      change: { attr: 'gender', value: 'F' },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })

    expect(dorm.roomGenderAt('Maple Hall', 'Room A', '2026-07-06')).toBe('F')
    expect(dorm.roomGenderAt('Maple Hall', 'Room A', '2026-07-12')).toBe('M')
    expect(dorm.roomGenderAt('Maple Hall', 'Room A', '2026-07-03')).toBe('M')
  })
})

describe('dormitoryStore.isBedActiveDuringStay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('returns true when the entire stay is outside any inactive window', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
    })
    // Stay ends before the override begins.
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-04', '2026-07-11')).toBe(true)
  })

  it('returns false if the stay overlaps an inactive bed window at any point', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-08',
      effectiveTo: '2026-07-10',
    })
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-09', '2026-07-15')).toBe(false)
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-04', '2026-07-09')).toBe(false)
  })

  it('honors the half-open convention (departure day is bed-available)', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-08',
      effectiveTo: null,
    })
    // Departing the morning of the 8th means the guest didn't sleep on the 8th.
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-04', '2026-07-08')).toBe(true)
  })

  it('respects a dorm-level close cascading down to the bed', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-04', '2026-07-08')).toBe(false)
    expect(dorm.isBedActiveDuringStay('MA1', '2026-07-12', '2026-07-15')).toBe(true)
  })
})

describe('dormitoryStore — preset apply/revert', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('applyPreset emits one override per template entry, all tagged with the same applicationId', () => {
    const dorm = seedBaseTree()
    const preset = dorm.addPreset({
      name: "Women's Retreat",
      entries: [
        {
          target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
          change: { attr: 'gender', value: 'F' },
        },
        {
          target: { kind: 'dormitory', dormitoryName: 'Pine Cabin' },
          change: { attr: 'active', value: false },
        },
      ],
    })

    const applicationId = dorm.applyPreset(preset.id, '2026-07-04', '2026-07-11')
    expect(applicationId).not.toBeNull()
    const emitted = dorm.overrides.filter(o => o.applicationId === applicationId)
    expect(emitted.length).toBe(2)
    expect(emitted.every(o => o.presetId === preset.id)).toBe(true)
    expect(emitted.every(o => o.effectiveFrom === '2026-07-04')).toBe(true)
    expect(emitted.every(o => o.effectiveTo === '2026-07-11')).toBe(true)
  })

  it('revertPresetApplication deletes only that application\'s overrides', () => {
    const dorm = seedBaseTree()
    const preset = dorm.addPreset({
      name: "Women's Retreat",
      entries: [
        {
          target: { kind: 'dormitory', dormitoryName: 'Pine Cabin' },
          change: { attr: 'active', value: false },
        },
      ],
    })

    const appA = dorm.applyPreset(preset.id, '2026-07-04', '2026-07-11')!
    const appB = dorm.applyPreset(preset.id, '2026-08-01', '2026-08-08')!
    expect(dorm.overrides.length).toBe(2)

    const removed = dorm.revertPresetApplication(appA)
    expect(removed).toBe(1)
    expect(dorm.overrides.length).toBe(1)
    expect(dorm.overrides[0].applicationId).toBe(appB)
  })

  it('deletePreset removes the preset AND all overrides emitted from it', () => {
    const dorm = seedBaseTree()
    const preset = dorm.addPreset({
      name: 'Winter Mode',
      entries: [
        {
          target: { kind: 'dormitory', dormitoryName: 'Pine Cabin' },
          change: { attr: 'active', value: false },
        },
      ],
    })
    dorm.applyPreset(preset.id, '2026-12-01', '2027-03-01')
    expect(dorm.overrides.length).toBe(1)

    dorm.deletePreset(preset.id)
    expect(dorm.presets.find(p => p.id === preset.id)).toBeUndefined()
    expect(dorm.overrides.length).toBe(0)
  })

  it('applyPreset on a missing preset returns null and emits nothing', () => {
    const dorm = seedBaseTree()
    const before = dorm.overrides.length
    const result = dorm.applyPreset('nonexistent-id', '2026-07-04', '2026-07-11')
    expect(result).toBeNull()
    expect(dorm.overrides.length).toBe(before)
  })
})

describe('dormitoryStore — date range validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('addOverride throws on a backwards date range', () => {
    const dorm = seedBaseTree()
    expect(() =>
      dorm.addOverride({
        target: { kind: 'bed', bedId: 'MA1' },
        change: { attr: 'active', value: false },
        effectiveFrom: '2026-07-11',
        effectiveTo: '2026-07-04',
      })
    ).toThrow(/effectiveTo.*before.*effectiveFrom/)
    expect(dorm.overrides.length).toBe(0)
  })

  it('addOverride accepts open-ended (null effectiveTo)', () => {
    const dorm = seedBaseTree()
    expect(() =>
      dorm.addOverride({
        target: { kind: 'bed', bedId: 'MA1' },
        change: { attr: 'active', value: false },
        effectiveFrom: '2026-07-11',
        effectiveTo: null,
      })
    ).not.toThrow()
  })
})

describe('dormitoryStore — open-ended overrides', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('null effectiveTo means open-ended forward', () => {
    const dorm = seedBaseTree()
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
    })

    expect(dorm.isBedActiveOn('MA1', '2026-08-12')).toBe(false)
    expect(dorm.isBedActiveOn('MA1', '2027-01-01')).toBe(false)
    // Before the effective date the base still wins.
    expect(dorm.isBedActiveOn('MA1', '2026-08-11')).toBe(true)
  })
})
