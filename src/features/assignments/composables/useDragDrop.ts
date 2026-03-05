/**
 * Drag and Drop Composable
 * Provides drag-and-drop and click-to-pick functionality for guest assignments
 */

import { ref, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { Bed } from '@/types'

// Shared state (singleton) for drag tracking across components
const draggedGuestId = ref<string | null>(null)
const dragOverBedId = ref<string | null>(null)
const isDragging = ref(false)
const mousePosition = ref({ x: 0, y: 0 })

// Pick-and-place state (singleton)
const pickedGuestId = ref<string | null>(null)
const pickedGroupGuestIds = ref<string[]>([])
const isPicking = computed(() => pickedGuestId.value !== null || pickedGroupGuestIds.value.length > 0)
const isPickingGroup = computed(() => pickedGroupGuestIds.value.length > 0)

// Mouse move handler for tracking position during drag
function handleMouseMove(event: MouseEvent) {
  mousePosition.value = { x: event.clientX, y: event.clientY }
}

// Keyboard handler for escape
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (pickedGuestId.value || pickedGroupGuestIds.value.length > 0)) {
    cancelPick()
  }
}

// Pick functions (defined outside useDragDrop so they can be used in handleKeyDown)
function cancelPick() {
  pickedGuestId.value = null
  pickedGroupGuestIds.value = []
  document.body.classList.remove('is-picking')
  document.body.classList.remove('is-picking-group')
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousemove', handleMouseMove)
}

export function useDragDrop() {

  /**
   * Setup draggable guest
   */
  function useDraggableGuest(guestId: string) {
    function onDragStart(event: DragEvent) {
      draggedGuestId.value = guestId
      isDragging.value = true

      // Capture initial position for floating blob
      mousePosition.value = { x: event.clientX, y: event.clientY }

      // Add mouse move listener for tracking
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('dragover', handleDragOver)

      // Add body class for global cursor
      document.body.classList.add('is-dragging')

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', guestId)
        // Make the default drag image invisible
        const img = new Image()
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        event.dataTransfer.setDragImage(img, 0, 0)
      }
      // Add dragging class for visual feedback
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging')
      }
    }

    function onDragEnd(event: DragEvent) {
      draggedGuestId.value = null
      isDragging.value = false

      // Remove mouse move listener
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('dragover', handleDragOver)

      // Remove body class for global cursor
      document.body.classList.remove('is-dragging')

      // Remove dragging class
      if (event.target instanceof HTMLElement) {
        event.target.classList.remove('dragging')
      }
    }

    return {
      draggable: true,
      onDragstart: onDragStart,
      onDragend: onDragEnd,
    }
  }

  // Handle dragover for mouse position tracking (drag events don't fire mousemove)
  function handleDragOver(event: DragEvent) {
    mousePosition.value = { x: event.clientX, y: event.clientY }
  }

  /**
   * Setup droppable bed
   */
  function useDroppableBed(bedId: string, onDrop: (guestId: string, bedId: string) => void) {
    function onDragOver(event: DragEvent) {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
      dragOverBedId.value = bedId
      // Add drag-over class for visual feedback
      if (event.target instanceof HTMLElement) {
        const bedElement = event.target.closest('.bed-row, .bed-slot')
        if (bedElement) {
          bedElement.classList.add('drag-over')
        }
      }
    }

    function onDragLeave(event: DragEvent) {
      dragOverBedId.value = null
      // Remove drag-over class
      if (event.target instanceof HTMLElement) {
        const bedElement = event.target.closest('.bed-row, .bed-slot')
        if (bedElement) {
          bedElement.classList.remove('drag-over')
        }
      }
    }

    function onDropEvent(event: DragEvent) {
      event.preventDefault()
      dragOverBedId.value = null

      // Remove drag-over class
      if (event.target instanceof HTMLElement) {
        const bedElement = event.target.closest('.bed-row, .bed-slot')
        if (bedElement) {
          bedElement.classList.remove('drag-over')
        }
      }

      const guestId = event.dataTransfer?.getData('text/plain')
      if (guestId) {
        onDrop(guestId, bedId)
      }
    }

    return {
      onDragover: onDragOver,
      onDragleave: onDragLeave,
      onDrop: onDropEvent,
    }
  }

  /**
   * Setup droppable unassigned guests area
   */
  function useDroppableUnassignedArea(onUnassign: (guestId: string) => void) {
    function onDragOver(event: DragEvent) {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
      // Add drag-over class for visual feedback
      if (event.target instanceof HTMLElement) {
        const container = event.target.closest('.guests-container, #guestsContainer')
        if (container) {
          container.classList.add('drag-over')
        }
      }
    }

    function onDragLeave(event: DragEvent) {
      // Remove drag-over class
      if (event.target instanceof HTMLElement) {
        const container = event.target.closest('.guests-container, #guestsContainer')
        if (container) {
          container.classList.remove('drag-over')
        }
      }
    }

    function onDropEvent(event: DragEvent) {
      event.preventDefault()

      // Remove drag-over class
      if (event.target instanceof HTMLElement) {
        const container = event.target.closest('.guests-container, #guestsContainer')
        if (container) {
          container.classList.remove('drag-over')
        }
      }

      const guestId = event.dataTransfer?.getData('text/plain')
      if (guestId) {
        onUnassign(guestId)
      }
    }

    return {
      onDragover: onDragOver,
      onDragleave: onDragLeave,
      onDrop: onDropEvent,
    }
  }

  // ============================================
  // Click-to-Pick Functions
  // ============================================

  const assignmentStore = useAssignmentStore()

  /**
   * Pick up a guest by clicking
   */
  function pickGuest(guestId: string, event?: MouseEvent) {
    // If a group is picked, cancel it and start single pick
    if (pickedGroupGuestIds.value.length > 0) {
      cancelPick()
    }

    // If same guest is already picked, cancel
    if (pickedGuestId.value === guestId) {
      cancelPick()
      return
    }

    // If another guest is picked, we're doing a swap - handle in placeGuest
    if (pickedGuestId.value) {
      // Get the bed of the clicked guest (if assigned)
      const clickedGuestBedId = assignmentStore.getAssignmentByGuest(guestId)
      if (clickedGuestBedId) {
        // Place picked guest in clicked guest's bed, then pick up clicked guest
        const previousPickedId = pickedGuestId.value
        assignmentStore.assignGuestToBed(previousPickedId, clickedGuestBedId)
        // Now pick up the clicked guest (they're now unassigned due to swap)
        pickedGuestId.value = guestId
      } else {
        // Clicked guest is unassigned, just switch to picking them
        pickedGuestId.value = guestId
      }
      return
    }

    // Start picking
    pickedGuestId.value = guestId
    document.body.classList.add('is-picking')
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)

    if (event) {
      mousePosition.value = { x: event.clientX, y: event.clientY }
    }
  }

  /**
   * Place a picked guest on a bed
   */
  function placeGuestOnBed(bedId: string) {
    if (!pickedGuestId.value) return false

    const guestId = pickedGuestId.value

    // Get current assignment if any
    const currentBedId = assignmentStore.getAssignmentByGuest(guestId)
    if (currentBedId === bedId) {
      // Same bed, just cancel
      cancelPick()
      return false
    }

    // Check if target bed is occupied
    const existingGuestId = assignmentStore.getAssignmentByBed(bedId)
    if (existingGuestId && existingGuestId !== guestId) {
      // Swap guests
      assignmentStore.swapGuests(guestId, existingGuestId)
    } else {
      // Just assign
      assignmentStore.assignGuestToBed(guestId, bedId)
    }

    cancelPick()
    return true
  }

  /**
   * Unassign the picked guest (drop in unassigned area)
   */
  function unassignPickedGuest() {
    if (!pickedGuestId.value) return false

    assignmentStore.unassignGuest(pickedGuestId.value)
    cancelPick()
    return true
  }

  /**
   * Pick up an entire group by clicking on group lines
   */
  function pickGroup(guestIds: string[], event?: MouseEvent) {
    if (guestIds.length === 0) return

    // If same group is already picked, cancel
    if (pickedGroupGuestIds.value.length > 0 &&
        pickedGroupGuestIds.value.length === guestIds.length &&
        pickedGroupGuestIds.value.every(id => guestIds.includes(id))) {
      cancelPick()
      return
    }

    // Cancel any existing single pick
    if (pickedGuestId.value) {
      pickedGuestId.value = null
    }

    pickedGroupGuestIds.value = [...guestIds]
    document.body.classList.add('is-picking')
    document.body.classList.add('is-picking-group')
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)

    if (event) {
      mousePosition.value = { x: event.clientX, y: event.clientY }
    }
  }

  /**
   * Place a picked group into a room starting from a clicked bed
   * Fills empty beds in the same room
   */
  function placeGroupOnBed(bedId: string): { placed: number; total: number } {
    if (pickedGroupGuestIds.value.length === 0) return { placed: 0, total: 0 }

    const dormitoryStore = useDormitoryStore()

    const room = dormitoryStore.getRoomByBedId(bedId)
    if (!room) {
      cancelPick()
      return { placed: 0, total: pickedGroupGuestIds.value.length }
    }

    // Get all active beds in this room
    const roomBeds = room.beds.filter((b: Bed) => b.active !== false)

    // Find empty beds in the room (not assigned and not the beds of our group members)
    const groupGuestSet = new Set(pickedGroupGuestIds.value)
    const emptyBeds = roomBeds.filter((b: Bed) => {
      if (!b.assignedGuestId) return true
      // If the bed is occupied by one of our group members, it's available (they'll be moved)
      if (groupGuestSet.has(b.assignedGuestId)) return true
      return false
    })

    // First unassign all group members from their current beds
    assignmentStore.saveToHistory()
    const guestsToPlace = [...pickedGroupGuestIds.value]

    for (const guestId of guestsToPlace) {
      if (assignmentStore.assignments.has(guestId)) {
        assignmentStore.unassignGuest(guestId, true)
      }
    }

    // Place guests into empty beds, starting from the clicked bed
    const clickedBedIndex = emptyBeds.findIndex((b: Bed) => b.bedId === bedId)
    // Reorder so clicked bed is first, then the rest in order
    const orderedBeds = clickedBedIndex >= 0
      ? [...emptyBeds.slice(clickedBedIndex), ...emptyBeds.slice(0, clickedBedIndex)]
      : emptyBeds

    // Re-check which beds are truly empty now (after unassigning group members)
    const availableBeds = orderedBeds.filter((b: Bed) => !b.assignedGuestId)

    let placed = 0
    for (let i = 0; i < guestsToPlace.length && i < availableBeds.length; i++) {
      assignmentStore.assignGuestToBed(guestsToPlace[i], availableBeds[i].bedId, true)
      placed++
    }

    cancelPick()
    return { placed, total: guestsToPlace.length }
  }

  /**
   * Unassign all picked group members
   */
  function unassignPickedGroup() {
    if (pickedGroupGuestIds.value.length === 0) return false

    assignmentStore.saveToHistory()
    for (const guestId of pickedGroupGuestIds.value) {
      if (assignmentStore.assignments.has(guestId)) {
        assignmentStore.unassignGuest(guestId, true)
      }
    }
    cancelPick()
    return true
  }

  return {
    // Drag state
    draggedGuestId,
    dragOverBedId,
    isDragging,
    mousePosition,
    // Pick state
    pickedGuestId,
    pickedGroupGuestIds,
    isPicking,
    isPickingGroup,
    // Drag functions
    useDraggableGuest,
    useDroppableBed,
    useDroppableUnassignedArea,
    // Pick functions
    pickGuest,
    pickGroup,
    cancelPick,
    placeGuestOnBed,
    placeGroupOnBed,
    unassignPickedGuest,
    unassignPickedGroup,
  }
}
