<template>
  <div class="csv-upload">
    <label v-if="label" for="csv-file-input" class="form-label">{{ label }}</label>
    <div class="upload-controls">
      <input
        id="csv-file-input"
        ref="fileInput"
        type="file"
        accept=".csv"
        class="form-input-hidden"
        @change="handleFileChange"
      />
      <button
        class="btn btn-upload"
        :class="{ highlighted: isHighlighted('upload-csv') }"
        data-hint-target="upload-csv"
        @click="triggerFileInput"
      >
        Upload Guest List CSV
      </button>
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
      :skipped-count="skippedCount"
      @close="closeWarningModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useHints } from '@/features/hints/composables/useHints'
import { useImportSummary } from '@/shared/composables/useImportSummary'
import type {
  ImportSummaryCancellation,
  ImportSummaryDateChange,
} from '@/shared/composables/useImportSummary'
import { useUtils } from '@/shared/composables/useUtils'
import { isActiveReservationStatus, isCancelledStatus } from '@/types'
import type { Guest } from '@/types'
import CSVWarningModal from './CSVWarningModal.vue'
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
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const settingsStore = useSettingsStore()
const timelineStore = useTimelineStore()
const { highlightedElement } = useHints()
const { parseGuestCSV } = useCSV()
const { showImportSummary } = useImportSummary()
const { createFullName } = useUtils()

// Check if an element should be highlighted (supports comma-separated targets)
const isHighlighted = (elementId: string) => {
  if (!highlightedElement.value) return false
  return highlightedElement.value.split(',').includes(elementId)
}

// Modal state
const showWarningModal = ref(false)
const successCount = ref(0)
const totalRows = ref(0)
const warnings = ref<string[]>([])
// Actual row count dropped (non-active + parse errors) — distinct from
// warnings.length, which counts entries (one summary entry can cover
// many rows). Used by the modal headline.
const skippedCount = ref(0)

// Stash for the parsed CSV between parse and the merge handler.
const pendingCSVData = ref<{ guests: Guest[]; warnings: string[]; totalRows: number } | null>(null)

function closeWarningModal() {
  showWarningModal.value = false
  successCount.value = 0
  totalRows.value = 0
  warnings.value = []
  skippedCount.value = 0
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const csvText = await readFileAsText(file)
    const result = parseGuestCSV(csvText)

    if (guestStore.guests.length > 0) {
      // Existing data is always merged (Add & Update). The "Reset and
      // Replace" mode used to be offered here but was too dangerous —
      // a single misclick could wipe all manual assignments — so it was
      // removed. The Settings → Danger Zone still exposes a destructive
      // "Delete All" for the rare case it's needed.
      pendingCSVData.value = result
      handleAddAndUpdate()
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

/**
 * For Reset & Replace mode: drop non-active reservations entirely (no
 * existing data to compare against). Active = `Reserved` or
 * `Reserved + Email address verified + confirmed`. Sources without a
 * `status` column are treated as all-active (legacy / non-Planyo).
 */
function performImport(result: { guests: Guest[]; warnings: string[]; totalRows: number }) {
  const activeGuests: Guest[] = []
  let skipped = 0
  for (const g of result.guests) {
    if (isActiveReservationStatus(g.status)) {
      activeGuests.push(g)
    } else {
      skipped++
    }
  }

  guestStore.importGuests(activeGuests)
  timelineStore.autoDetectDateRange()

  emit('upload-success', activeGuests)

  const allWarnings = [...result.warnings]
  if (skipped > 0) {
    allWarnings.unshift(
      `Skipped ${skipped} non-active reservation${skipped === 1 ? '' : 's'} (cancelled or incomplete).`
    )
  }
  if (allWarnings.length > 0) {
    successCount.value = activeGuests.length
    totalRows.value = result.totalRows
    warnings.value = allWarnings
    // Actual rows dropped: non-active reservations + per-row parse errors.
    skippedCount.value = skipped + result.warnings.length
    showWarningModal.value = true
  }
}

function handleAddAndUpdate() {
  if (!pendingCSVData.value) return

  const existingGuests = [...guestStore.guests]
  const newRows = pendingCSVData.value.guests

  // Build lookup maps for matching. Planyo ID is canonical (handles same
  // person across multiple retreats). Name is the fallback when an
  // existing guest pre-dates this feature and has no `planyoId`.
  const existingByPlanyoId = new Map<string, Guest>()
  const existingByName = new Map<string, Guest>()
  for (const g of existingGuests) {
    if (g.planyoId) existingByPlanyoId.set(g.planyoId, g)
    const nameKey = `${(g.firstName || '').toLowerCase()}|${(g.lastName || '').toLowerCase()}`
    existingByName.set(nameKey, g)
  }

  function findMatch(row: Guest): Guest | undefined {
    if (row.planyoId && existingByPlanyoId.has(row.planyoId)) {
      return existingByPlanyoId.get(row.planyoId)
    }
    const nameKey = `${(row.firstName || '').toLowerCase()}|${(row.lastName || '').toLowerCase()}`
    return existingByName.get(nameKey)
  }

  const cancellations: ImportSummaryCancellation[] = []
  const dateChanges: ImportSummaryDateChange[] = []

  newRows.forEach(newGuest => {
    const isActive = isActiveReservationStatus(newGuest.status)
    const isCancelled = isCancelledStatus(newGuest.status)
    const existing = findMatch(newGuest)

    if (existing) {
      const wasActive = !existing.isCancelled
      const existingIndex = existingGuests.indexOf(existing)

      if (isCancelled) {
        // Cancellation: mark existing as cancelled, surface in modal.
        // Don't auto-unassign — operator decides.
        if (wasActive) {
          cancellations.push({
            guestName: createFullName(existing),
            bedId: assignmentStore.assignments.get(existing.id) || undefined,
            arrival: existing.arrival,
            departure: existing.departure,
            status: newGuest.status,
          })
        }
        existingGuests[existingIndex] = {
          ...existing,
          status: newGuest.status,
          isCancelled: true,
          planyoId: existing.planyoId || newGuest.planyoId,
        }
        return
      }

      if (!isActive) {
        // Neither active nor cancelled (e.g. "Not completed").
        // Silently skip — leave the existing record untouched.
        return
      }

      // Active update: detect date changes, then merge fields.
      const arrivalChanged =
        newGuest.arrival && newGuest.arrival !== (existing.arrival || '')
      const departureChanged =
        newGuest.departure && newGuest.departure !== (existing.departure || '')
      if (arrivalChanged || departureChanged) {
        dateChanges.push({
          guestName: createFullName(existing),
          oldArrival: existing.arrival,
          oldDeparture: existing.departure,
          newArrival: newGuest.arrival || existing.arrival,
          newDeparture: newGuest.departure || existing.departure,
        })
      }

      const merged: Record<string, any> = {
        ...existing,
        // Reactivation: clear cancelled flag if it was set.
        isCancelled: false,
      }
      for (const [key, value] of Object.entries(newGuest)) {
        if (key === 'id' || key === 'importOrder') continue
        if (value !== undefined && value !== '' && value !== null) {
          merged[key] = value
        }
      }
      existingGuests[existingIndex] = merged as Guest
    } else {
      // No matching existing guest. Only add if active — cancelled and
      // "other" statuses (e.g. "Not completed") for new rows are
      // silently dropped (nothing to compare to).
      if (isActive) {
        existingGuests.push(newGuest)
      }
    }
  })

  guestStore.importGuests(existingGuests)
  timelineStore.autoDetectDateRange()

  emit('upload-success', newRows)

  // After the import settles, also detect bed-overlap conflicts caused
  // by date changes, then surface everything in one combined modal.
  nextTick(() => {
    const bedConflicts = assignmentStore.getAllOverlapConflicts().map(c => ({
      bedId: c.bedId,
      guests: c.guests.map(g => {
        const guest = guestStore.getGuestById(g.guestId)
        return {
          guestName: guest ? createFullName(guest) : '(unknown)',
          arrival: g.arrival,
          departure: g.departure,
        }
      }),
    }))
    showImportSummary({ cancellations, dateChanges, bedConflicts })
  })

  if (pendingCSVData.value.warnings.length > 0) {
    successCount.value = newRows.length
    totalRows.value = pendingCSVData.value.totalRows
    warnings.value = pendingCSVData.value.warnings
    // Re-import path only surfaces parse errors here (non-active rows
    // are reflected in the diff modal instead), so each warning entry
    // == one row.
    skippedCount.value = pendingCSVData.value.warnings.length
    showWarningModal.value = true
  }

  pendingCSVData.value = null
}

function triggerFileInput() {
  fileInput.value?.click()
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

.form-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.btn-upload {
  padding: 6px 12px;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  &.highlighted {
    animation: hint-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
}

@keyframes hint-pulse {
  0%, 100% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(16, 185, 129, 0.25);
  }
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
