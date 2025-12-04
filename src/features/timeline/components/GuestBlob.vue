<template>
  <div
    class="guest-blob"
    :style="blobStyle"
    :draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="guest-info">
      <span class="guest-text">{{ displayText }}</span>
    </div>
    <div class="guest-actions">
      <button
        v-if="hasNotes"
        class="icon-button notes-icon"
        @click.stop
      >
        📝
        <span class="notes-tooltip">{{ notesText }}</span>
      </button>
      <button
        class="icon-button edit-icon"
        title="View/Edit guest details"
        @click.stop="onEditClick"
      >
        ✏️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GuestBlobData } from '../types/timeline'

interface Props {
  guestBlob: GuestBlobData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  dragStart: [guestId: string, bedId: string]
  dragEnd: []
  editGuest: [guestId: string]
}>()

const displayText = computed(() => {
  const guest = props.guestBlob.guest
  const name = guest.preferredName
    ? `${guest.preferredName} ${guest.lastName}`
    : `${guest.firstName} ${guest.lastName}`

  const genderCode =
    guest.gender === 'male' ? 'M' : guest.gender === 'female' ? 'F' : 'NB'

  return `${name}, ${genderCode}, ${guest.age}`
})

const hasNotes = computed(() => {
  return !!props.guestBlob.guest.notes && props.guestBlob.guest.notes.trim().length > 0
})

const notesText = computed(() => {
  return props.guestBlob.guest.notes || ''
})

const blobStyle = computed(() => {
  const spanCount = props.guestBlob.spanCount
  // Calculate width: span multiple cells plus borders
  // Each cell is variable width based on zoom, borders are 1px between cells
  const width = `calc(${spanCount * 100}% + ${(spanCount - 1) * 1}px)`

  return {
    width,
    left: '0',
  }
})

function onDragStart(event: DragEvent) {
  // Set drag data
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', props.guestBlob.guestId)

  // Add visual feedback
  ;(event.target as HTMLElement).classList.add('dragging')

  emit('dragStart', props.guestBlob.guestId, props.guestBlob.bedId)
}

function onDragEnd(event: DragEvent) {
  // Remove visual feedback
  ;(event.target as HTMLElement).classList.remove('dragging')

  emit('dragEnd')
}

function onEditClick() {
  emit('editGuest', props.guestBlob.guestId)
}
</script>

<style scoped lang="scss">
.guest-blob {
  position: absolute;
  top: 2px;
  bottom: 2px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: move;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  z-index: 1;
  pointer-events: auto;
  overflow: hidden;
  line-height: 1.2;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  &.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
}

.guest-info {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.guest-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.7rem;
  text-align: center;
  width: 100%;
}

.guest-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;

  .edit-icon {
    opacity: 0;
    transition: opacity 0.2s;
  }

  .notes-icon {
    opacity: 1; // Notes icon always visible
  }
}

.guest-blob:hover {
  .guest-actions .edit-icon {
    opacity: 1;
  }
}

.icon-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 3px;
  padding: 2px 4px;
  cursor: pointer;
  font-size: 0.7rem;
  line-height: 1;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  &.notes-icon {
    position: relative;

    .notes-tooltip {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      white-space: pre-wrap;
      max-width: 300px;
      min-width: 150px;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      z-index: 1000;
      line-height: 1.4;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      font-weight: 400;
    }

    &:hover .notes-tooltip {
      opacity: 1;
      visibility: visible;
    }
  }
}
</style>
