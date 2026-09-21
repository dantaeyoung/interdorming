/**
 * Settings Store
 * Manages application settings and preferences
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings, AutoPlacementPriority, GenderColorSettings, GroupType, ColumnConfig } from '@/types'
import { DEFAULT_SETTINGS, DEFAULT_GROUP_PLACEMENT_ORDER, DEFAULT_GUEST_DATA_COLUMNS, DEFAULT_TABLE_VIEW_COLUMNS } from '@/types'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    // State
    const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
    const guestDataColumns = ref<ColumnConfig[]>([...DEFAULT_GUEST_DATA_COLUMNS.map(c => ({ ...c }))])
    const tableViewColumns = ref<ColumnConfig[]>([...DEFAULT_TABLE_VIEW_COLUMNS.map(c => ({ ...c }))])

    // Merge any new default priorities that don't exist in saved settings
    function mergePriorities() {
      const existingPriorityNames = new Set(
        settings.value.autoPlacement.priorities.map(p => p.name)
      )

      // Add any missing priorities from defaults
      for (const defaultPriority of DEFAULT_SETTINGS.autoPlacement.priorities) {
        if (!existingPriorityNames.has(defaultPriority.name)) {
          // Find the correct position to insert (maintain order from defaults)
          const defaultIndex = DEFAULT_SETTINGS.autoPlacement.priorities.findIndex(
            p => p.name === defaultPriority.name
          )
          settings.value.autoPlacement.priorities.splice(defaultIndex, 0, {
            ...defaultPriority,
          })
        }
      }
    }

    // Ensure genderColors exists for existing users
    function migrateGenderColors() {
      if (!settings.value.genderColors) {
        settings.value.genderColors = { ...DEFAULT_SETTINGS.genderColors }
      }
    }

    // Ensure groupPlacementOrder exists for existing users
    function migrateGroupPlacementOrder() {
      if (!settings.value.autoPlacement.groupPlacementOrder) {
        settings.value.autoPlacement.groupPlacementOrder = [...DEFAULT_GROUP_PLACEMENT_ORDER]
      }
    }

    // Ensure couple settings exist for existing users
    function migrateCoupleSettings() {
      if (!settings.value.autoPlacement.couples) {
        settings.value.autoPlacement.couples = { ...DEFAULT_SETTINGS.autoPlacement.couples }
      }
    }

    /**
     * Merge saved column config with defaults, so columns added in code
     * show up for operators who already have saved settings.
     *
     * Order and visibility belong to the user and are preserved from
     * the saved config. The label belongs to the code — the UI offers
     * no way to edit one — so it is always refreshed from defaults;
     * otherwise renaming a column in code would never reach anyone who
     * had already used the app.
     */
    function migrateColumns(saved: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] {
      const defaultByKey = new Map(defaults.map(c => [c.key, c]))
      const savedKeys = new Set(saved.map(c => c.key))

      // Keep saved columns that still exist in defaults (preserves order
      // + visibility), taking the label from the default.
      const merged = saved
        .filter(c => defaultByKey.has(c.key))
        .map(c => ({ ...c, label: defaultByKey.get(c.key)!.label }))

      // Append any new default columns not in saved
      for (const def of defaults) {
        if (!savedKeys.has(def.key)) {
          merged.push({ ...def })
        }
      }

      return merged
    }

    /**
     * All settings migrations, in one place so they can run twice.
     *
     * Running them here in the setup body only ever migrates the
     * pristine defaults: pinia-plugin-persistedstate hydrates AFTER the
     * setup function returns and overwrites these refs with whatever
     * was in localStorage, discarding the result. They must therefore
     * run again from the `afterHydrate` hook below, which is what
     * actually makes new columns and priorities reach existing users.
     */
    function runMigrations() {
      mergePriorities()
      migrateGenderColors()
      migrateGroupPlacementOrder()
      migrateCoupleSettings()
      guestDataColumns.value = migrateColumns(guestDataColumns.value, DEFAULT_GUEST_DATA_COLUMNS)
      tableViewColumns.value = migrateColumns(tableViewColumns.value, DEFAULT_TABLE_VIEW_COLUMNS)
    }

    // Covers a fresh install, where nothing is hydrated.
    runMigrations()

    // Actions
    function updateWarningSettings(key: keyof Settings['warnings'], value: boolean) {
      settings.value.warnings[key] = value
    }

    function updateDisplaySettings(key: keyof Settings['display'], value: boolean) {
      settings.value.display[key] = value
    }

    function updateAutoPlacementEnabled(enabled: boolean) {
      settings.value.autoPlacement.enabled = enabled
    }

    function updateAutoPlacementPriority(index: number, updates: Partial<AutoPlacementPriority>) {
      if (index >= 0 && index < settings.value.autoPlacement.priorities.length) {
        settings.value.autoPlacement.priorities[index] = {
          ...settings.value.autoPlacement.priorities[index],
          ...updates,
        }
      }
    }

    function updateConstraintRelaxation(value: boolean) {
      settings.value.autoPlacement.allowConstraintRelaxation = value
    }

    function toggleDeveloperMode(value: boolean) {
      settings.value.developerMode = value
    }

    function updateGenderColor(gender: keyof GenderColorSettings, color: string) {
      settings.value.genderColors[gender] = color
    }

    function updateGroupPlacementOrder(order: GroupType[]) {
      settings.value.autoPlacement.groupPlacementOrder = order
    }

    function resetToDefaults() {
      settings.value = { ...DEFAULT_SETTINGS }
    }

    function toggleColumnVisibility(view: 'guestData' | 'tableView', key: string) {
      const cols = view === 'guestData' ? guestDataColumns.value : tableViewColumns.value
      const col = cols.find(c => c.key === key)
      if (col) col.visible = !col.visible
    }

    function reorderColumn(view: 'guestData' | 'tableView', fromKey: string, toKey: string) {
      const cols = view === 'guestData' ? guestDataColumns.value : tableViewColumns.value
      const fromIndex = cols.findIndex(c => c.key === fromKey)
      const toIndex = cols.findIndex(c => c.key === toKey)
      if (fromIndex === -1 || toIndex === -1) return

      const [removed] = cols.splice(fromIndex, 1)
      cols.splice(toIndex, 0, removed)
    }

    function resetColumns(view: 'guestData' | 'tableView') {
      if (view === 'guestData') {
        guestDataColumns.value = [...DEFAULT_GUEST_DATA_COLUMNS.map(c => ({ ...c }))]
      } else {
        tableViewColumns.value = [...DEFAULT_TABLE_VIEW_COLUMNS.map(c => ({ ...c }))]
      }
    }

    return {
      // State
      settings,
      guestDataColumns,
      tableViewColumns,

      // Actions
      updateWarningSettings,
      updateDisplaySettings,
      updateAutoPlacementEnabled,
      updateAutoPlacementPriority,
      updateConstraintRelaxation,
      updateGroupPlacementOrder,
      toggleDeveloperMode,
      updateGenderColor,
      resetToDefaults,
      toggleColumnVisibility,
      reorderColumn,
      resetColumns,
      // Exposed so the `afterHydrate` persist hook can call it. That
      // hook lives in the options object, outside this closure, so it
      // cannot reach the local function directly.
      runMigrations,
    }
  },
  {
    persist: {
      key: 'dormAssignments-settings',
      // v4 renamed `paths` to `pick`; the old key is silently ignored,
      // which persisted the whole store instead of just these three.
      pick: ['settings', 'guestDataColumns', 'tableViewColumns'],
      // Hydration replaces the refs wholesale, so migrations have to run
      // again here — otherwise columns added in code never reach an
      // operator who already has saved settings.
      afterHydrate: ctx => {
        ;(ctx.store as unknown as { runMigrations: () => void }).runMigrations()
      },
    },
  }
)
