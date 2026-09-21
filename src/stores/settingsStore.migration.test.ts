/**
 * Column migration across persisted-state hydration.
 *
 * A column added to DEFAULT_GUEST_DATA_COLUMNS never reached anyone who
 * already had saved settings: migrateColumns ran only in the store's
 * setup body, and pinia-plugin-persistedstate hydrates AFTER setup
 * returns, overwriting the refs and discarding the result.
 *
 * These tests drive the real plugin against a seeded localStorage, so
 * they fail if the afterHydrate wiring regresses — including if the
 * hook throws, which it silently did when it referenced a function
 * scoped inside the setup closure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useSettingsStore } from './settingsStore'
import { DEFAULT_GUEST_DATA_COLUMNS } from '@/types'

const SETTINGS_KEY = 'dormAssignments-settings'

const store: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: () => null,
    length: 0,
  },
  writable: true,
})

/** Saved settings as they looked before the roomRequest column existed. */
function seedLegacySettings(overrides: Record<string, unknown> = {}) {
  const legacyColumns = DEFAULT_GUEST_DATA_COLUMNS
    .filter(c => c.key !== 'roomRequest')
    .map(c => ({ ...c }))
  window.localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ guestDataColumns: legacyColumns, tableViewColumns: legacyColumns, ...overrides })
  )
  return legacyColumns
}

/**
 * Pinia queues plugins registered via `pinia.use()` in `toBeInstalled`
 * and only moves them to `_p` when `app.use(pinia)` runs. Calling
 * `setActivePinia` alone leaves the persistence plugin uninstalled, so
 * the store never hydrates and every assertion here passes trivially
 * against the defaults. Mount a throwaway app so the plugin is real.
 */
function freshPinia() {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({ render: () => null }).use(pinia)
  setActivePinia(pinia)
  return pinia
}

describe('settingsStore column migration across hydration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('actually installs the persistence plugin (guards the harness)', () => {
    seedLegacySettings()
    freshPinia()
    const s = useSettingsStore() as unknown as { $persist?: unknown }
    // Without this, every other test here passes against bare defaults
    expect(typeof s.$persist).toBe('function')
  })

  it('adds a newly-defined column to a legacy saved config', () => {
    const legacy = seedLegacySettings()
    expect(legacy.some(c => c.key === 'roomRequest')).toBe(false)

    freshPinia()
    const s = useSettingsStore()

    const keys = s.guestDataColumns.map(c => c.key)
    expect(keys).toContain('roomRequest')
    expect(s.tableViewColumns.map(c => c.key)).toContain('roomRequest')
  })

  it('gives the new column its default label and visibility', () => {
    seedLegacySettings()
    freshPinia()
    const s = useSettingsStore()

    const col = s.guestDataColumns.find(c => c.key === 'roomRequest')
    expect(col).toBeDefined()
    expect(col!.label).toBe('Room Chosen')
    expect(col!.visible).toBe(true)
  })

  it('refreshes labels from defaults, since labels are code-owned', () => {
    const legacyColumns = DEFAULT_GUEST_DATA_COLUMNS
      .filter(c => c.key !== 'roomRequest')
      .map(c => (c.key === 'housingType' ? { ...c, label: 'Stale Label' } : { ...c }))
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ guestDataColumns: legacyColumns, tableViewColumns: legacyColumns })
    )

    freshPinia()
    const s = useSettingsStore()

    expect(s.guestDataColumns.find(c => c.key === 'housingType')!.label).toBe('Housing')
  })

  it("preserves the user's visibility choices", () => {
    const legacyColumns = DEFAULT_GUEST_DATA_COLUMNS
      .filter(c => c.key !== 'roomRequest')
      .map(c => (c.key === 'email' ? { ...c, visible: false } : { ...c }))
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ guestDataColumns: legacyColumns, tableViewColumns: legacyColumns })
    )

    freshPinia()
    const s = useSettingsStore()

    expect(s.guestDataColumns.find(c => c.key === 'email')!.visible).toBe(false)
  })

  it('does not throw during hydration', () => {
    // The original afterHydrate referenced a setup-scoped function from
    // the options object, throwing a ReferenceError the plugin swallowed
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    seedLegacySettings()
    freshPinia()
    expect(() => useSettingsStore()).not.toThrow()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('still works on a fresh install with nothing saved', () => {
    freshPinia()
    const s = useSettingsStore()
    expect(s.guestDataColumns.map(c => c.key)).toContain('roomRequest')
  })
})
