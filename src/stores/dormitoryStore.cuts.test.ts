/**
 * Tests for the Configuration Cuts model (specs/ConfigurationCuts.md).
 *
 * Covers: cutAt with each source mode, deleteCut + initial-config
 * refusal, the migration path from override+preset state to
 * configurations+templates, and dormitoriesAt resolving via the
 * configurations array once migrated.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDormitoryStore } from './dormitoryStore'

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

function seedBase() {
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
          beds: [{ bedId: 'MA1', bedType: 'single', position: 1, assignments: [] }],
        },
      ],
    },
  ])
  return dorm
}

describe('cuts: migration from override-free initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('seeds a single initial configuration when there are no overrides', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    expect(dorm.configurations.length).toBe(1)
    expect(dorm.configurations[0].effectiveFrom).toBeNull()
    expect(dorm.configurations[0].name).toBe('Default')
    expect(dorm.cutsModelMigrationComplete).toBe(true)
  })

  it('is idempotent — re-running does not duplicate configurations', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const after1 = dorm.configurations.length
    dorm.migrateToCutsModel()
    expect(dorm.configurations.length).toBe(after1)
  })
})

describe('cuts: migration from overrides + presets', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('creates a configuration per segment boundary and clears overrides', () => {
    const dorm = seedBase()
    // One open-ended override + one bounded one → 2 boundaries → 3 segments
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    dorm.addOverride({
      target: { kind: 'bed', bedId: 'MA1' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
    })

    dorm.migrateToCutsModel()
    // Initial + 3 cut points (Jul 4, Jul 12, Aug 12)
    expect(dorm.configurations.length).toBe(4)
    expect(dorm.configurations[0].effectiveFrom).toBeNull()
    expect(dorm.configurations[1].effectiveFrom).toBe('2026-07-04')
    expect(dorm.configurations[2].effectiveFrom).toBe('2026-07-12')
    expect(dorm.configurations[3].effectiveFrom).toBe('2026-08-12')
    expect(dorm.overrides.length).toBe(0)
    expect(dorm.cutsModelMigrationComplete).toBe(true)
  })

  it('snapshots each segment with the right effective state', () => {
    const dorm = seedBase()
    dorm.addOverride({
      target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
      change: { attr: 'active', value: false },
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
    })
    dorm.migrateToCutsModel()

    // Segment covering Jul 6 should show Maple Hall closed.
    const at = dorm.configurationCovering('2026-07-06')
    expect(at?.dormitories[0].dormitoryName).toBe('Maple Hall')
    expect(at?.dormitories[0].active).toBe(false)

    // Segment after the window should show Maple Hall open again.
    const after = dorm.configurationCovering('2026-08-01')
    expect(after?.dormitories[0].active).toBe(true)
  })

  it('converts each preset into a template', () => {
    const dorm = seedBase()
    dorm.addPreset({
      name: 'Closed for cleaning',
      entries: [
        {
          target: { kind: 'dormitory', dormitoryName: 'Maple Hall' },
          change: { attr: 'active', value: false },
        },
      ],
    })
    dorm.migrateToCutsModel()
    expect(dorm.configurationTemplates.length).toBe(1)
    expect(dorm.configurationTemplates[0].name).toBe('Closed for cleaning')
    expect(dorm.configurationTemplates[0].dormitories[0].active).toBe(false)
  })
})

describe('cuts: cutAt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('inserts a new configuration starting at the cut date, copied from the covering config', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const created = dorm.cutAt('2026-07-04')
    expect(created).not.toBeNull()
    expect(dorm.configurations.length).toBe(2)
    expect(created!.effectiveFrom).toBe('2026-07-04')
    // Copied from initial → same snapshot (independent object)
    expect(created!.dormitories[0].dormitoryName).toBe('Maple Hall')
    expect(created!.dormitories).not.toBe(dorm.configurations[0].dormitories)
  })

  it('refuses to insert a duplicate cut date', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    dorm.cutAt('2026-07-04')
    const second = dorm.cutAt('2026-07-04')
    expect(second).toBeNull()
    expect(dorm.configurations.length).toBe(2)
  })

  it('copyFrom uses another configuration as the source', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const first = dorm.cutAt('2026-07-04', { name: 'Closed' })!
    // Edit first to mark Maple Hall closed.
    first.dormitories[0].active = false

    const second = dorm.cutAt('2026-09-01', { copyFrom: first.id })!
    expect(second.dormitories[0].active).toBe(false)
    // Mutations on second don't leak into first.
    second.dormitories[0].active = true
    expect(first.dormitories[0].active).toBe(false)
  })

  it('empty: true creates a configuration with no dormitories', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const created = dorm.cutAt('2026-07-04', { empty: true, name: 'Blank' })
    expect(created).not.toBeNull()
    expect(created!.dormitories).toEqual([])
    expect(created!.name).toBe('Blank')
  })

  it('templateId pastes a template snapshot', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const tpl = dorm.saveConfigurationAsTemplate(dorm.configurations[0].id, 'Template')
    expect(tpl).not.toBeNull()
    // Manually edit the template's snapshot.
    tpl!.dormitories[0].active = false

    const cut = dorm.cutAt('2026-08-12', { templateId: tpl!.id })!
    expect(cut.dormitories[0].active).toBe(false)
  })
})

describe('cuts: deleteCut', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('refuses to delete the initial (effectiveFrom: null) configuration', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const initial = dorm.configurations[0]
    expect(dorm.deleteCut(initial.id)).toBe(false)
    expect(dorm.configurations.length).toBe(1)
  })

  it('deletes a non-initial cut and merges its window into the previous one', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    dorm.cutAt('2026-07-04')
    expect(dorm.configurations.length).toBe(2)
    const second = dorm.configurations[1]
    expect(dorm.deleteCut(second.id)).toBe(true)
    expect(dorm.configurations.length).toBe(1)
    expect(dorm.configurations[0].effectiveFrom).toBeNull()
  })
})

describe('cuts: configurationWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('returns null start for the initial configuration; endExclusive matches the next cut', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const initial = dorm.configurations[0]
    const cut = dorm.cutAt('2026-08-01')!
    const w = dorm.configurationWindow(initial.id)
    expect(w).toEqual({ start: null, endExclusive: '2026-08-01' })
    const wCut = dorm.configurationWindow(cut.id)
    expect(wCut).toEqual({ start: '2026-08-01', endExclusive: null })
  })

  it('middle cut has both start and endExclusive set', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    dorm.cutAt('2026-07-04')
    dorm.cutAt('2026-08-01')
    const middle = dorm.configurations[1]
    const w = dorm.configurationWindow(middle.id)
    expect(w).toEqual({ start: '2026-07-04', endExclusive: '2026-08-01' })
  })
})

describe('cuts: dormitoriesAt routes through configurations after migration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('returns the matching configuration\'s snapshot', () => {
    const dorm = seedBase()
    dorm.migrateToCutsModel()
    const cut = dorm.cutAt('2026-07-04', { name: 'Cleaning' })!
    cut.dormitories[0].active = false

    const beforeCut = dorm.dormitoriesAt('2026-07-03')
    const inCut = dorm.dormitoriesAt('2026-07-05')
    expect(beforeCut[0].active).toBe(true)
    expect(inCut[0].active).toBe(false)
  })
})
