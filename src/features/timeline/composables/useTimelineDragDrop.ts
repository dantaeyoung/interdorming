/**
 * Timeline Drag-and-Drop Composable
 * Handles drag-and-drop and click-to-pick interactions for moving guests between beds
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useAssignmentStore } from '@/stores/assignmentStore'
import type { DragDropState } from '../types/timeline'

// Shared state - created outside the function so it's a singleton
const dragState = ref<DragDropState>({
  isDragging: false,
  draggedGuestId: null,
  sourceBedId: null,
  targetBedId: null,
  isValidTarget: false,
})

// Click-to-pick state (separate from drag state) - also shared
const pickState = ref<{
  isPicked: boolean
  pickedGuestId: string | null
  sourceBedId: string | null
  hoverBedId: string | null
}>({
  isPicked: false,
  pickedGuestId: null,
  sourceBedId: null,
  hoverBedId: null,
})

export function useTimelineDragDrop() {
  const assignmentStore = useAssignmentStore()

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
   * Called when guest is dropped on a bed or unassigned area
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

    // Handle drop on unassigned area (unassign the guest)
    if (targetBedId === 'unassigned') {
      assignmentStore.unassignGuest(guestId)
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

  // ============================================
  // Click-to-Pick Functions
  // ============================================

  /**
   * Pick up a guest by clicking (toggle pick state)
   */
  function pickGuest(guestId: string, bedId: string) {
    // If same guest is already picked, cancel the pick
    if (pickState.value.isPicked && pickState.value.pickedGuestId === guestId) {
      cancelPick()
      return
    }

    // Cancel any existing drag
    if (dragState.value.isDragging) {
      endDrag()
    }

    pickState.value = {
      isPicked: true,
      pickedGuestId: guestId,
      sourceBedId: bedId,
    }
  }

  /**
   * Place a picked guest on a bed
   */
  function placeGuest(targetBedId: string) {
    if (!pickState.value.isPicked || !pickState.value.pickedGuestId) {
      return false
    }

    const guestId = pickState.value.pickedGuestId
    const sourceBedId = pickState.value.sourceBedId

    // Don't do anything if placed on same bed
    if (targetBedId === sourceBedId) {
      cancelPick()
      return false
    }

    // Handle placement on unassigned area
    if (targetBedId === 'unassigned') {
      assignmentStore.unassignGuest(guestId)
      cancelPick()
      return true
    }

    // Assign guest to new bed
    assignmentStore.assignGuestToBed(guestId, targetBedId)
    cancelPick()
    return true
  }

  /**
   * Cancel the current pick operation
   */
  function cancelPick() {
    pickState.value = {
      isPicked: false,
      pickedGuestId: null,
      sourceBedId: null,
      hoverBedId: null,
    }
  }

  /**
   * Check if a guest is currently picked
   */
  function isGuestPicked(guestId: string): boolean {
    return pickState.value.isPicked && pickState.value.pickedGuestId === guestId
  }

  /**
   * Get the currently picked guest ID
   */
  function getPickedGuestId(): string | null {
    return pickState.value.pickedGuestId
  }

  /**
   * Check if any guest is picked (for showing valid drop targets)
   */
  function hasPickedGuest(): boolean {
    return pickState.value.isPicked
  }

  /**
   * Called when hovering over a bed while a guest is picked
   */
  function enterPickTarget(bedId: string) {
    if (!pickState.value.isPicked) return
    pickState.value.hoverBedId = bedId
  }

  /**
   * Called when leaving a bed while a guest is picked
   */
  function leavePickTarget() {
    pickState.value.hoverBedId = null
  }

  /**
   * Check if a specific bed is the current pick hover target
   */
  function isPickHoverTarget(bedId: string): boolean {
    return pickState.value.isPicked && pickState.value.hoverBedId === bedId
  }

  /**
   * Handle keyboard events for canceling pick
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && pickState.value.isPicked) {
      cancelPick()
    }
  }

  // Set up keyboard listener
  function setupKeyboardListener() {
    document.addEventListener('keydown', handleKeyDown)
  }

  function cleanupKeyboardListener() {
    document.removeEventListener('keydown', handleKeyDown)
  }

  return {
    // Drag state and functions
    dragState,
    startDrag,
    endDrag,
    enterDropTarget,
    leaveDropTarget,
    dropOnBed,
    isDragging,
    isDropTarget,
    getDraggedGuestId,
    // Pick state and functions
    pickState,
    pickGuest,
    placeGuest,
    cancelPick,
    isGuestPicked,
    getPickedGuestId,
    hasPickedGuest,
    enterPickTarget,
    leavePickTarget,
    isPickHoverTarget,
    setupKeyboardListener,
    cleanupKeyboardListener,
  }
}
