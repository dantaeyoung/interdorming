/**
 * Tests for the layout → preset-entries diff used by the
 * "Multiple Layouts → Base + Presets" migration dialog.
 */

import { describe, it, expect } from 'vitest'
import { diffLayoutToPresetEntries, buildPresetPayloadsFromLayouts } from './useLayoutDiff'
import type { Dormitory, RoomLayout } from '@/types'

function dorm(name: string, opts: Partial<Dormitory> = {}): Dormitory {
  return {
    dormitoryName: name,
    active: true,
    rooms: [],
    ...opts,
  }
}

const BASE_TREE: Dormitory[] = [
  dorm('Maple Hall', {
    rooms: [
      {
        roomName: 'Room A',
        roomGender: 'M',
        active: true,
        beds: [
          { bedId: 'MA1', bedType: 'lower', position: 1, assignments: [] },
          { bedId: 'MA2', bedType: 'upper', position: 2, assignments: [] },
        ],
      },
      {
        roomName: 'Room B',
        roomGender: 'F',
        active: true,
        beds: [{ bedId: 'MB1', bedType: 'single', position: 1, assignments: [] }],
      },
    ],
  }),
  dorm('Pine Cabin', {
    rooms: [
      {
        roomName: 'Family',
        roomGender: 'Coed',
        active: true,
        beds: [{ bedId: 'PF1', bedType: 'single', position: 1, assignments: [] }],
      },
    ],
  }),
]

describe('diffLayoutToPresetEntries', () => {
  it('returns no entries and no warnings when the two trees match', () => {
    const result = diffLayoutToPresetEntries(BASE_TREE, JSON.parse(JSON.stringify(BASE_TREE)))
    expect(result.entries).toEqual([])
    expect(result.structuralWarnings).toEqual([])
  })

  it('emits a room.gender entry when only gender differs', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other[0].rooms[0].roomGender = 'F'
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.entries).toEqual([
      {
        target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
        change: { attr: 'gender', value: 'F' },
      },
    ])
    expect(result.structuralWarnings).toEqual([])
  })

  it('emits a dormitory.active entry when the dorm is closed in the other layout', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other[1].active = false
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.entries).toEqual([
      {
        target: { kind: 'dormitory', dormitoryName: 'Pine Cabin' },
        change: { attr: 'active', value: false },
      },
    ])
  })

  it('emits a bed.active entry when a single bed is closed', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other[0].rooms[0].beds[0].active = false
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.entries).toEqual([
      {
        target: { kind: 'bed', bedId: 'MA1' },
        change: { attr: 'active', value: false },
      },
    ])
  })

  it('warns (not emits) when a dormitory was added/removed', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other.push(dorm('Surprise Dorm', { rooms: [] }))
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.entries).toEqual([])
    expect(result.structuralWarnings.some(w => /Surprise Dorm.*new/.test(w))).toBe(true)
  })

  it('warns when bed type or position changes', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other[0].rooms[0].beds[0].bedType = 'upper'
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.structuralWarnings.some(w => /type\/position/.test(w))).toBe(true)
  })

  it('emits a compound diff: dorm closed AND room gender swapped AND bed closed', () => {
    const other = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
    other[1].active = false
    other[0].rooms[0].roomGender = 'F'
    other[0].rooms[1].beds[0].active = false
    const result = diffLayoutToPresetEntries(BASE_TREE, other)
    expect(result.entries.length).toBe(3)
    expect(result.entries).toContainEqual({
      target: { kind: 'dormitory', dormitoryName: 'Pine Cabin' },
      change: { attr: 'active', value: false },
    })
    expect(result.entries).toContainEqual({
      target: { kind: 'room', dormitoryName: 'Maple Hall', roomName: 'Room A' },
      change: { attr: 'gender', value: 'F' },
    })
    expect(result.entries).toContainEqual({
      target: { kind: 'bed', bedId: 'MB1' },
      change: { attr: 'active', value: false },
    })
  })
})

function makeLayout(id: string, name: string, dormitories: Dormitory[]): RoomLayout {
  return { id, name, description: '', dormitories, createdAt: '', updatedAt: '' }
}

describe('buildPresetPayloadsFromLayouts', () => {
  it('skips the base layout itself + skips layouts whose diff is empty', () => {
    const base = makeLayout('a', 'Summer', BASE_TREE)
    const identical = makeLayout('b', 'Summer Clone', JSON.parse(JSON.stringify(BASE_TREE)))
    const differs = makeLayout('c', 'Winter', winterVariant())
    const result = buildPresetPayloadsFromLayouts(base, [base, identical, differs])
    expect(result.length).toBe(1)
    expect(result[0].sourceLayout.id).toBe('c')
  })
})

function winterVariant(): Dormitory[] {
  const t = JSON.parse(JSON.stringify(BASE_TREE)) as Dormitory[]
  t[1].active = false // close Pine Cabin in winter
  return t
}
