/**
 * Settings Store
 * Manages application settings and preferences
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings, AutoPlacementPriority } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    // State
    const settings = ref<Settings>({ ...DEFAULT_SETTINGS })

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

    // Run migration on initialization
    mergePriorities()

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

    function resetToDefaults() {
      settings.value = { ...DEFAULT_SETTINGS }
    }

    return {
      // State
      settings,

      // Actions
      updateWarningSettings,
      updateDisplaySettings,
      updateAutoPlacementEnabled,
      updateAutoPlacementPriority,
      updateConstraintRelaxation,
      resetToDefaults,
    }
  },
  {
    persist: {
      key: 'dormAssignments-settings',
      paths: ['settings'],
    },
  }
)
