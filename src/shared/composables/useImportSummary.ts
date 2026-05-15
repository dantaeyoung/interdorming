/**
 * Combined post-import summary dialog state.
 *
 * Surfaces three categories of changes that result from a CSV re-upload:
 *   - Cancellations  (guests whose status moved from active → cancelled)
 *   - Date changes   (guests whose arrival or departure shifted)
 *   - Bed conflicts  (date changes broke an existing bed assignment)
 *
 * Replaces the older `useImportConflictDialog` which only handled bed
 * conflicts. Per spec, all three are merged into a single dialog so the
 * operator sees one summary instead of being interrupted twice.
 */

import { ref } from 'vue'

export interface ImportSummaryCancellation {
  guestName: string
  bedId?: string
  arrival?: string
  departure?: string
  status?: string
}

export interface ImportSummaryDateChange {
  guestName: string
  oldArrival?: string
  oldDeparture?: string
  newArrival?: string
  newDeparture?: string
}

export interface ImportSummaryBedConflict {
  bedId: string
  guests: Array<{
    guestName: string
    arrival?: string
    departure?: string
  }>
}

const isOpen = ref(false)
const cancellations = ref<ImportSummaryCancellation[]>([])
const dateChanges = ref<ImportSummaryDateChange[]>([])
const bedConflicts = ref<ImportSummaryBedConflict[]>([])

export interface ImportSummaryPayload {
  cancellations?: ImportSummaryCancellation[]
  dateChanges?: ImportSummaryDateChange[]
  bedConflicts?: ImportSummaryBedConflict[]
}

export function useImportSummary() {
  /**
   * Open the summary dialog. No-op if all three sections are empty.
   */
  function showImportSummary(payload: ImportSummaryPayload) {
    const c = payload.cancellations ?? []
    const d = payload.dateChanges ?? []
    const b = payload.bedConflicts ?? []
    if (c.length === 0 && d.length === 0 && b.length === 0) return
    cancellations.value = c
    dateChanges.value = d
    bedConflicts.value = b
    isOpen.value = true
  }

  function dismissImportSummary() {
    isOpen.value = false
    cancellations.value = []
    dateChanges.value = []
    bedConflicts.value = []
  }

  return {
    isOpen,
    cancellations,
    dateChanges,
    bedConflicts,
    showImportSummary,
    dismissImportSummary,
  }
}
