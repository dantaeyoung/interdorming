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

    // Merge saved column config with defaults (handles new columns added in code)
    function migrateColumns(saved: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] {
      const defaultKeys = new Set(defaults.map(c => c.key))
      const savedKeys = new Set(saved.map(c => c.key))

      // Keep saved columns that still exist in defaults (preserves order + visibility)
      const merged = saved.filter(c => defaultKeys.has(c.key))

      // Append any new default columns not in saved
      for (const def of defaults) {
        if (!savedKeys.has(def.key)) {
          merged.push({ ...def })
        }
      }

      return merged
    }

    // Run migration on initialization
    mergePriorities()
    migrateGenderColors()
    migrateGroupPlacementOrder()
    migrateCoupleSettings()
    guestDataColumns.value = migrateColumns(guestDataColumns.value, DEFAULT_GUEST_DATA_COLUMNS)
    tableViewColumns.value = migrateColumns(tableViewColumns.value, DEFAULT_TABLE_VIEW_COLUMNS)

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
    }
  },
  {
    persist: {
      key: 'dormAssignments-settings',
      paths: ['settings', 'guestDataColumns', 'tableViewColumns'],
    },
  }
)
