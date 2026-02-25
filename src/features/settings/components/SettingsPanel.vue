<template>
  <div class="settings-panel">
    <!-- Data Backup Section -->
    <div class="settings-section">
      <h2>Data Backup</h2>
      <p class="section-description">
        Export a complete backup of all your data (guests, rooms, assignments, settings) or restore from a previous backup.
      </p>
      <DataBackupControls />
    </div>

    <!-- Gender Colors Section -->
    <div class="settings-section">
      <h2>Gender Colors</h2>
      <p class="section-description">
        Customize the colors used to indicate gender throughout the application.
      </p>
      <div class="color-settings">
        <div class="color-row">
          <label class="color-label">Male (M)</label>
          <input
            type="color"
            :value="settingsStore.settings.genderColors.male"
            @input="settingsStore.updateGenderColor('male', ($event.target as HTMLInputElement).value)"
            class="color-picker"
          />
          <span class="color-value">{{ settingsStore.settings.genderColors.male }}</span>
        </div>
        <div class="color-row">
          <label class="color-label">Female (F)</label>
          <input
            type="color"
            :value="settingsStore.settings.genderColors.female"
            @input="settingsStore.updateGenderColor('female', ($event.target as HTMLInputElement).value)"
            class="color-picker"
          />
          <span class="color-value">{{ settingsStore.settings.genderColors.female }}</span>
        </div>
        <div class="color-row">
          <label class="color-label">Non-Binary (NB)</label>
          <input
            type="color"
            :value="settingsStore.settings.genderColors.nonBinary"
            @input="settingsStore.updateGenderColor('nonBinary', ($event.target as HTMLInputElement).value)"
            class="color-picker"
          />
          <span class="color-value">{{ settingsStore.settings.genderColors.nonBinary }}</span>
        </div>
      </div>
    </div>

    <!-- Auto-Placement Settings -->
    <AutoPlacementSettings />

    <!-- Developer Settings -->
    <div class="settings-section developer-section">
      <h2>Developer Settings</h2>
      <p class="section-description">
        Options for development and testing purposes.
      </p>
      <div class="setting-row">
        <label class="toggle-label">
          <input
            type="checkbox"
            :checked="settingsStore.settings.developerMode"
            @change="settingsStore.toggleDeveloperMode(($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-text">Developer Mode</span>
        </label>
        <span class="setting-description">Show developer tools like "Load Test Data" button</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AutoPlacementSettings from './AutoPlacementSettings.vue'
import { DataBackupControls } from '@/features/backup/components'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()
</script>

<style scoped lang="scss">
.settings-panel {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .section-description {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .toggle-text {
    font-weight: 500;
    color: #374151;
  }
}

.setting-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.color-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-label {
  width: 120px;
  font-weight: 500;
  color: #374151;
}

.color-picker {
  width: 48px;
  height: 32px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }
}

.color-value {
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
}
</style>
