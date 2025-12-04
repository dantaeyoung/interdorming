<template>
  <div
    class="guest-blob"
    :style="blobStyle"
    :draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    :title="tooltipText"
  >
    <span class="guest-name">{{ displayName }}</span>
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
}>()

const displayName = computed(() => props.guestBlob.displayName)

const blobStyle = computed(() => {
  const spanCount = props.guestBlob.spanCount
  // Calculate width: span multiple cells plus borders
  // Each cell is 150px, borders are 1px between cells
  const width = `calc(${spanCount * 100}% + ${(spanCount - 1) * 1}px)`

  return {
    width,
    left: '0',
  }
})

const tooltipText = computed(() => {
  const guest = props.guestBlob.guest
  const parts = [
    `${guest.firstName} ${guest.lastName}`,
    `Age: ${guest.age}`,
    `Gender: ${guest.gender}`,
  ]

  if (guest.groupName) {
    parts.push(`Group: ${guest.groupName}`)
  }

  if (guest.lowerBunk) {
    parts.push('Requires lower bunk')
  }

  parts.push(
    `Dates: ${guest.arrival.toLocaleDateString()} - ${guest.departure.toLocaleDateString()}`
  )

  return parts.join('\n')
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
</script>

<style scoped lang="scss">
.guest-blob {
  position: absolute;
  top: 2px;
  bottom: 2px;
  padding: 2px 8px;
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
  justify-content: center;
  z-index: 5;
  pointer-events: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }

  &.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
}

.guest-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
