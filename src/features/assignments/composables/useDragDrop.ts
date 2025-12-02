/**
 * Drag and Drop Composable
 * Provides drag-and-drop functionality for guest assignments
 */

import { ref } from 'vue'

export function useDragDrop() {
  const draggedGuestId = ref<string | null>(null)
  const dragOverBedId = ref<string | null>(null)

  /**
   * Setup draggable guest
   */
  function useDraggableGuest(guestId: string) {
    function onDragStart(event: DragEvent) {
      draggedGuestId.value = guestId
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', guestId)
      }
      // Add dragging class for visual feedback
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging')
      }
    }

    function onDragEnd(event: DragEvent) {
      draggedGuestId.value = null
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

  return {
    draggedGuestId,
    dragOverBedId,
    useDraggableGuest,
    useDroppableBed,
    useDroppableUnassignedArea,
  }
}
