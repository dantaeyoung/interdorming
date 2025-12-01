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
