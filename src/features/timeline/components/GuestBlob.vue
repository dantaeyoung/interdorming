<template>
  <div
    class="guest-blob"
    :class="{ 'has-warnings': hasWarnings }"
    :style="blobStyle"
    :draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mouseenter="handleBlobMouseEnter"
    @mouseleave="handleBlobMouseLeave"
  >
    <div class="guest-info">
      <span class="guest-name">{{ guestName }}</span>
      <span class="gender-badge" :class="`gender-${props.guestBlob.guest.gender}`">{{
        genderCode
      }}</span>
      <span class="guest-age">{{ props.guestBlob.guest.age }}</span>
    </div>
    <!-- Warning icon - positioned on left edge -->
    <div v-if="hasWarnings" class="warning-icon" ref="warningIconRef">
      ⚠️
    </div>

    <div class="guest-actions">
      <button
        v-if="hasNotes"
        ref="notesButtonRef"
        class="icon-button notes-icon"
        @click.stop
        @mouseenter="handleNotesMouseEnter"
        @mouseleave="showNotesTooltip = false"
      >
        📝
      </button>
      <button
        class="icon-button edit-icon"
        title="View/Edit guest details"
        @click.stop="onEditClick"
      >
        ✏️
      </button>
    </div>

    <!-- Teleport tooltips to body to avoid z-index issues -->
    <Teleport to="body">
      <div v-if="showNotesTooltip" class="notes-tooltip-overlay" :style="tooltipPosition">
        {{ notesText }}
      </div>
      <div v-if="showWarningTooltip" class="warning-tooltip-overlay" :style="warningTooltipPosition">
        <ul class="warning-list">
          <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useValidationStore } from '@/stores/validationStore'
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

const showNotesTooltip = ref(false)
const tooltipPosition = ref({ top: '0px', left: '0px' })
const notesButtonRef = ref<HTMLButtonElement | null>(null)

const showWarningTooltip = ref(false)
const warningTooltipPosition = ref({ top: '0px', left: '0px' })
const warningIconRef = ref<HTMLDivElement | null>(null)

const validationStore = useValidationStore()

const warnings = computed(() => {
  const bedId = props.guestBlob.bedId
  return validationStore.getWarningsForBed(bedId)
})

const hasWarnings = computed(() => warnings.value.length > 0)

const warningsText = computed(() => {
  return warnings.value.join('\n')
})

const guestName = computed(() => {
  const guest = props.guestBlob.guest
  return guest.preferredName
    ? `${guest.preferredName} ${guest.lastName}`
    : `${guest.firstName} ${guest.lastName}`
})

const genderCode = computed(() => {
  const guest = props.guestBlob.guest
  return guest.gender === 'male' ? 'M' : guest.gender === 'female' ? 'F' : 'NB'
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

function handleNotesMouseEnter(event: MouseEvent) {
  if (notesButtonRef.value) {
    const rect = notesButtonRef.value.getBoundingClientRect()
    tooltipPosition.value = {
      top: `${rect.top}px`,
      left: `${rect.left + rect.width / 2}px`,
    }
  }
  showNotesTooltip.value = true
}

function handleBlobMouseEnter() {
  if (hasWarnings.value && warningIconRef.value) {
    const rect = warningIconRef.value.getBoundingClientRect()
    warningTooltipPosition.value = {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.right + 4}px`,
    }
    showWarningTooltip.value = true
  }
}

function handleBlobMouseLeave() {
  showWarningTooltip.value = false
}
</script>

<style scoped lang="scss">
.guest-blob {
  position: absolute;
  top: 2px;
  bottom: 2px;
  padding: 4px 8px;
  background: #9ca3af;
  color: #1f2937;
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

  &.has-warnings {
    background: #fef2f2;
    border: 2px solid #ef4444;
    color: #991b1b;
  }

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
  gap: 6px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.guest-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.7rem;
}

.gender-badge {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: #1f2937;

  &.gender-male {
    background-color: #93c5fd;
  }

  &.gender-female {
    background-color: #f9a8d4;
  }

  &.gender-non-binary {
    background-color: #c084fc;
  }

  .guest-blob.has-warnings & {
    border: 1px solid #991b1b;
  }
}

.guest-age {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 500;
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
  background: rgba(0, 0, 0, 0.1);
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
    background: rgba(0, 0, 0, 0.2);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

}

.warning-icon {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.65rem;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.warning-tooltip-overlay {
  position: fixed;
  background: rgba(239, 68, 68, 0.95);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  max-width: 300px;
  z-index: 99999;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  line-height: 1.4;
  transform: translateY(-50%);

  // Arrow pointing to the left (towards the warning icon)
  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid rgba(239, 68, 68, 0.95);
  }

  .warning-list {
    margin: 0;
    padding-left: 16px;
    list-style-type: disc;

    li {
      margin: 2px 0;
    }
  }
}

.notes-tooltip-overlay {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 400;
  white-space: pre-wrap;
  max-width: 300px;
  z-index: 99999;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  line-height: 1.4;
  transform: translate(-50%, calc(-100% - 8px));
}
</style>
