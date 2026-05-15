/**
 * Shared group-conflict dialog flow.
 *
 * When a group drop would put any member in conflict with an existing
 * assignment (date overlap), the operator sees a "Group placement blocked"
 * dialog listing every conflict. Per spec: no assignments are made; only
 * Cancel is offered.
 *
 * Usage:
 *   const { showGroupConflicts } = useGroupConflictDialog()
 *   if (conflicts.length > 0) {
 *     showGroupConflicts(roomName, conflicts)
 *     return
 *   }
 */

import { ref } from 'vue'

export interface GroupConflictItem {
  memberName: string
  bedId: string
  conflictsWith: Array<{
    guestName: string
    arrival?: string
    departure?: string
  }>
}

const isOpen = ref(false)
const roomName = ref('')
const conflicts = ref<GroupConflictItem[]>([])

export function useGroupConflictDialog() {
  function showGroupConflicts(room: string, items: GroupConflictItem[]) {
    roomName.value = room
    conflicts.value = items
    isOpen.value = true
  }

  function dismissGroupConflicts() {
    isOpen.value = false
    conflicts.value = []
  }

  return {
    isOpen,
    roomName,
    conflicts,
    showGroupConflicts,
    dismissGroupConflicts,
  }
}
