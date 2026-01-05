<template>
  <div class="csv-upload">
    <label v-if="label" for="csv-file-input" class="form-label">{{ label }}</label>
    <div class="upload-controls">
      <input
        id="csv-file-input"
        ref="fileInput"
        type="file"
        accept=".csv"
        class="form-input"
        @change="handleFileChange"
      />
      <button v-if="showLoadTest && settingsStore.settings.developerMode" class="btn btn-load-test" @click="$emit('load-test-data')">
        Load Test Data
      </button>
    </div>
    <p v-if="hint" class="upload-hint">{{ hint }}</p>

    <CSVWarningModal
      :is-open="showWarningModal"
      :success-count="successCount"
      :total-rows="totalRows"
      :warnings="warnings"
      @close="closeWarningModal"
    />

    <CSVImportModeModal
      :is-open="showImportModeModal"
      :existing-guest-count="guestStore.guests.length"
      @reset-and-replace="handleResetAndReplace"
      @add-and-update="handleAddAndUpdate"
      @cancel="handleImportModeCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useGuestStore } from '@/stores/guestStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { Guest } from '@/types'
import CSVWarningModal from './CSVWarningModal.vue'
import CSVImportModeModal from './CSVImportModeModal.vue'

interface Props {
  label?: string
  hint?: string
  showLoadTest?: boolean
}

withDefaults(defineProps<Props>(), {
  label: 'Upload CSV File',
  hint: '',
  showLoadTest: false,
})

const emit = defineEmits<{
  'upload-success': [guests: Guest[]]
  'upload-error': [error: string]
  'load-test-data': []
  'request-reset-confirmation': [callback: () => void]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const guestStore = useGuestStore()
const settingsStore = useSettingsStore()
const timelineStore = useTimelineStore()
const { parseGuestCSV } = useCSV()

// Modal state
const showWarningModal = ref(false)
const successCount = ref(0)
const totalRows = ref(0)
const warnings = ref<string[]>([])

// Import mode modal state
const showImportModeModal = ref(false)
const pendingCSVData = ref<{ guests: Guest[]; warnings: string[]; totalRows: number } | null>(null)

function closeWarningModal() {
  showWarningModal.value = false
  successCount.value = 0
  totalRows.value = 0
  warnings.value = []
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const csvText = await readFileAsText(file)
    const result = parseGuestCSV(csvText)

    // Check if guests already exist
    if (guestStore.guests.length > 0) {
      // Store the parsed data and show import mode modal
      pendingCSVData.value = result
      showImportModeModal.value = true
    } else {
      // No existing guests, proceed with normal import
      performImport(result)
    }

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
    emit('upload-error', errorMessage)

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function performImport(result: { guests: Guest[]; warnings: string[]; totalRows: number }) {
  // Import guests into store
  guestStore.importGuests(result.guests)

  // Auto-detect timeline date range from imported guest arrival/departure dates
  timelineStore.autoDetectDateRange()

  emit('upload-success', result.guests)

  // Show modal with results (only if there are warnings)
  if (result.warnings.length > 0) {
    successCount.value = result.guests.length
    totalRows.value = result.totalRows
    warnings.value = result.warnings
    showWarningModal.value = true
  }
}

function handleResetAndReplace() {
  showImportModeModal.value = false

  if (!pendingCSVData.value) return

  // Request confirmation from parent component
  emit('request-reset-confirmation', () => {
    if (pendingCSVData.value) {
      performImport(pendingCSVData.value)
      pendingCSVData.value = null
    }
  })
}

function handleAddAndUpdate() {
  showImportModeModal.value = false

  if (!pendingCSVData.value) return

  // Merge guests: update existing, add new
  const existingGuests = [...guestStore.guests]
  const newGuests = pendingCSVData.value.guests

  newGuests.forEach(newGuest => {
    // Find existing guest by matching first name and last name
    const existingIndex = existingGuests.findIndex(
      g => g.firstName.toLowerCase() === newGuest.firstName.toLowerCase() &&
           g.lastName.toLowerCase() === newGuest.lastName.toLowerCase()
    )

    if (existingIndex !== -1) {
      // Update existing guest (preserve ID and importOrder)
      existingGuests[existingIndex] = {
        ...newGuest,
        id: existingGuests[existingIndex].id,
        importOrder: existingGuests[existingIndex].importOrder
      }
    } else {
      // Add new guest
      existingGuests.push(newGuest)
    }
  })

  // Import the merged list
  guestStore.importGuests(existingGuests)

  // Auto-detect timeline date range from imported guest arrival/departure dates
  timelineStore.autoDetectDateRange()

  emit('upload-success', newGuests)

  // Show warnings if any
  if (pendingCSVData.value.warnings.length > 0) {
    successCount.value = newGuests.length
    totalRows.value = pendingCSVData.value.totalRows
    warnings.value = pendingCSVData.value.warnings
    showWarningModal.value = true
  }

  pendingCSVData.value = null
}

function handleImportModeCancel() {
  showImportModeModal.value = false
  pendingCSVData.value = null
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
</script>

<style scoped lang="scss">
.csv-upload {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  white-space: nowrap;
}

.upload-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-input {
  font-size: 0.8rem;
  padding: 4px 8px;
  max-width: 200px;
}

.btn-load-test {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }
}

.upload-hint {
  margin: 0;
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
