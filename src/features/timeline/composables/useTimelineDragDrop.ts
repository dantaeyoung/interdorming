/**
 * Timeline Drag-and-Drop Composable
 * Handles drag-and-drop interactions for moving guests between beds
 */

import { ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignmentStore'
import type { DragDropState } from '../types/timeline'

export function useTimelineDragDrop() {
  const assignmentStore = useAssignmentStore()

  const dragState = ref<DragDropState>({
    isDragging: false,
    draggedGuestId: null,
    sourceBedId: null,
    targetBedId: null,
    isValidTarget: false,
  })

  /**
   * Called when drag starts on a guest blob
   */
  function startDrag(guestId: string, bedId: string) {
    dragState.value = {
      isDragging: true,
      draggedGuestId: guestId,
      sourceBedId: bedId,
      targetBedId: null,
      isValidTarget: false,
    }
  }

  /**
   * Called when drag ends (drop or cancel)
   */
  function endDrag() {
    dragState.value = {
      isDragging: false,
      draggedGuestId: null,
      sourceBedId: null,
      targetBedId: null,
      isValidTarget: false,
    }
  }

  /**
   * Called when dragging over a potential drop target bed
   */
  function enterDropTarget(bedId: string) {
    if (!dragState.value.isDragging) return

    dragState.value.targetBedId = bedId
    dragState.value.isValidTarget = isValidDropTarget(bedId)
  }

  /**
   * Called when leaving a drop target
   */
  function leaveDropTarget() {
    dragState.value.targetBedId = null
    dragState.value.isValidTarget = false
  }

  /**
   * Called when guest is dropped on a bed
   */
  function dropOnBed(targetBedId: string) {
    if (!dragState.value.isDragging || !dragState.value.draggedGuestId) {
      endDrag()
      return
    }

    const guestId = dragState.value.draggedGuestId
    const sourceBedId = dragState.value.sourceBedId

    // Don't do anything if dropped on same bed
    if (targetBedId === sourceBedId) {
      endDrag()
      return
    }

    // Reassign guest to new bed using existing assignment store
    assignmentStore.assignGuestToBed(guestId, targetBedId)

    endDrag()
  }

  /**
   * Check if a bed is a valid drop target
   * For now, all beds are valid (warnings are shown but not blocking)
   */
  function isValidDropTarget(bedId: string): boolean {
    // In Phase 1, all beds are valid drop targets
    // Visual warnings will be shown for conflicts, but drops are not prevented
    return true
  }

  /**
   * Check if currently dragging
   */
  function isDragging(): boolean {
    return dragState.value.isDragging
  }

  /**
   * Check if a specific bed is the current drop target
   */
  function isDropTarget(bedId: string): boolean {
    return dragState.value.targetBedId === bedId
  }

  /**
   * Get the currently dragged guest ID
   */
  function getDraggedGuestId(): string | null {
    return dragState.value.draggedGuestId
  }

  return {
    dragState,
    startDrag,
    endDrag,
    enterDropTarget,
    leaveDropTarget,
    dropOnBed,
    isDragging,
    isDropTarget,
    getDraggedGuestId,
  }
}
