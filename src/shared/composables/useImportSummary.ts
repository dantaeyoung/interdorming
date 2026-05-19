/**
 * Combined post-import summary dialog state.
 *
 * Surfaces four categories of changes that result from a CSV re-upload:
 *   - Cancellations   (guests whose status moved from active → cancelled)
 *   - Date changes    (guests whose arrival or departure shifted)
 *   - Bed conflicts   (date changes broke an existing bed assignment)
 *   - Skipped new rows (new rows dropped because their status isn't
 *                       active — by default the re-import path silently
 *                       drops these, so we list them by name + status
 *                       to give the operator a chance to spot a
 *                       misspelled "Reserved" status or similar)
 *
 * Replaces the older `useImportConflictDialog` which only handled bed
 * conflicts. Per spec, all four are merged into a single dialog so the
 * operator sees one summary instead of being interrupted multiple times.
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

export interface ImportSummarySkippedNewRow {
  guestName: string
  status?: string
  planyoId?: string
}

const isOpen = ref(false)
const cancellations = ref<ImportSummaryCancellation[]>([])
const dateChanges = ref<ImportSummaryDateChange[]>([])
const bedConflicts = ref<ImportSummaryBedConflict[]>([])
const skippedNewRows = ref<ImportSummarySkippedNewRow[]>([])

export interface ImportSummaryPayload {
  cancellations?: ImportSummaryCancellation[]
  dateChanges?: ImportSummaryDateChange[]
  bedConflicts?: ImportSummaryBedConflict[]
  skippedNewRows?: ImportSummarySkippedNewRow[]
}

export function useImportSummary() {
  /**
   * Open the summary dialog. No-op if every section is empty.
   */
  function showImportSummary(payload: ImportSummaryPayload) {
    const c = payload.cancellations ?? []
    const d = payload.dateChanges ?? []
    const b = payload.bedConflicts ?? []
    const s = payload.skippedNewRows ?? []
    if (c.length === 0 && d.length === 0 && b.length === 0 && s.length === 0) return
    cancellations.value = c
    dateChanges.value = d
    bedConflicts.value = b
    skippedNewRows.value = s
    isOpen.value = true
  }

  function dismissImportSummary() {
    isOpen.value = false
    cancellations.value = []
    dateChanges.value = []
    bedConflicts.value = []
    skippedNewRows.value = []
  }

  return {
    isOpen,
    cancellations,
    dateChanges,
    bedConflicts,
    skippedNewRows,
    showImportSummary,
    dismissImportSummary,
  }
}
