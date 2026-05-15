/**
 * Surfaces bed-overlap conflicts that arise from a CSV re-upload (or any
 * bulk update that changes guest dates). Per spec: import proceeds, then
 * a modal lists each conflicting bed so the operator can resolve them.
 */

import { ref } from 'vue'

export interface ImportConflictBed {
  bedId: string
  guests: Array<{
    guestName: string
    arrival?: string
    departure?: string
  }>
}

const isOpen = ref(false)
const conflicts = ref<ImportConflictBed[]>([])

export function useImportConflictDialog() {
  function showImportConflicts(items: ImportConflictBed[]) {
    if (items.length === 0) return
    conflicts.value = items
    isOpen.value = true
  }

  function dismissImportConflicts() {
    isOpen.value = false
    conflicts.value = []
  }

  return {
    isOpen,
    conflicts,
    showImportConflicts,
    dismissImportConflicts,
  }
}
