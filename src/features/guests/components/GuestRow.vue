<template>
  <tr
    :class="['guest-row', { 'picked-up': isPickedUp, 'has-suggestion': hasSuggestion }]"
    v-bind="draggableProps"
  >
    <td class="order-cell">{{ guest.importOrder || '-' }}</td>
    <td>
      <div class="name-cell">
        <div v-if="familyPosition !== 'none'" :class="['family-indicator', `family-${familyPosition}`]">
          <div class="family-dot"></div>
        </div>
        <span class="name-text">{{ displayName }}</span>
        <span v-if="hasSuggestion" class="suggestion-indicator" title="Has suggested placement">
          ✨
        </span>
      </div>
    </td>
    <td>{{ guest.lastName }}</td>
    <td>
      <span :class="['badge', `badge-gender-${guest.gender.toLowerCase()}`]">
        {{ guest.gender }}
      </span>
    </td>
    <td>{{ guest.age }}</td>
    <td>
      <span v-if="guest.lowerBunk" class="badge badge-info">Yes</span>
      <span v-else class="text-muted">No</span>
    </td>
    <td>{{ guest.groupName || '-' }}</td>
    <td>{{ guest.arrival || '-' }}</td>
    <td>{{ guest.departure || '-' }}</td>
    <td>{{ guest.indivGrp || '-' }}</td>
    <td class="notes-cell">
      <span
        v-if="guest.notes"
        ref="notesCellRef"
        class="notes-text"
        @mouseenter="handleNotesMouseEnter"
        @mouseleave="showNotesModal = false"
      >
        {{ truncateNotes(guest.notes) }}
      </span>
      <span v-else>-</span>
    </td>
    <td>{{ guest.retreat || '-' }}</td>
    <td>{{ guest.ratePerNight || '-' }}</td>
    <td>{{ guest.priceQuoted || '-' }}</td>
    <td>{{ guest.amountPaid || '-' }}</td>
    <td>{{ guest.firstVisit || '-' }}</td>
    <td>{{ guest.roomPreference || '-' }}</td>
    <td>
      <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
    </td>
    <td>
      <button @click="handleEdit" class="btn-edit" title="Edit guest">
        ✎
      </button>
    </td>

    <!-- Teleport notes modal to body -->
    <Teleport to="body">
      <div v-if="showNotesModal && guest.notes" class="notes-modal-overlay" :style="modalPosition">
        {{ guest.notes }}
      </div>
    </Teleport>
  </tr>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import { useUtils } from '@/shared/composables/useUtils'
import { ValidationWarning } from '@/shared/components'
import type { Guest } from '@/types'

interface Props {
  guest: Guest
  familyPosition?: 'none' | 'first' | 'middle' | 'last' | 'only'
}

interface Emits {
  (e: 'edit', guest: Guest): void
}

const props = withDefaults(defineProps<Props>(), {
  familyPosition: 'none'
})

const emit = defineEmits<Emits>()

const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const { createDisplayName } = useUtils()
const { useDraggableGuest } = useDragDrop()

const displayName = computed(() => createDisplayName(props.guest))

const isPickedUp = computed(() => assignmentStore.pickedUpGuestId === props.guest.id)

const hasSuggestion = computed(() => assignmentStore.suggestedAssignments.has(props.guest.id))

const warnings = computed(() => validationStore.getWarningsForGuest(props.guest.id))

const draggableProps = useDraggableGuest(props.guest.id)

// Notes modal state
const showNotesModal = ref(false)
const modalPosition = ref({ top: '0px', left: '0px' })
const notesCellRef = ref<HTMLSpanElement | null>(null)

function truncateNotes(notes: string, maxLength: number = 50): string {
  if (notes.length <= maxLength) return notes
  return notes.substring(0, maxLength) + '...'
}

function handleNotesMouseEnter() {
  if (notesCellRef.value) {
    const rect = notesCellRef.value.getBoundingClientRect()
    modalPosition.value = {
      top: `${rect.top}px`,
      left: `${rect.left + rect.width / 2}px`,
    }
  }
  showNotesModal.value = true
}

function handleEdit() {
  emit('edit', props.guest)
}
</script>

<style scoped lang="scss">
.guest-row {
  cursor: move;
  transition: background-color 0.2s, opacity 0.2s;

  &:hover {
    background-color: #f9fafb;
  }

  &.picked-up {
    opacity: 0.5;
    background-color: #fef3c7;
  }

  &.has-suggestion {
    background-color: #eff6ff;
    border-left: 3px solid #3b82f6;
  }

  &.dragging {
    opacity: 0.4;
  }
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.name-text {
  flex: 1;
}

.family-indicator {
  position: absolute;
  left: -20px;
  top: 0;
  bottom: 0;
  width: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    left: 5px;
    width: 2px;
    background-color: #ef4444;
  }

  &.family-first::before {
    top: 50%;
    bottom: -1px;
  }

  &.family-middle::before {
    top: -1px;
    bottom: -1px;
  }

  &.family-last::before {
    top: -1px;
    bottom: 50%;
  }

  &.family-only::before {
    display: none;
  }
}

.family-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #ef4444;
  position: relative;
  z-index: 1;
}

.suggestion-indicator {
  font-size: 0.9rem;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;

  &.badge-gender-m {
    background-color: #dbeafe;
    color: #1e40af;
  }

  &.badge-gender-f {
    background-color: #fce7f3;
    color: #9f1239;
  }

  &.badge-gender-non-binary\/other {
    background-color: #f3e8ff;
    color: #6b21a8;
  }

  &.badge-info {
    background-color: #d1fae5;
    color: #065f46;
  }
}

.text-muted {
  color: #9ca3af;
}

td {
  padding: 6px 10px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.85rem;

  &.order-cell {
    font-weight: 600;
    color: #6b7280;
    text-align: center;
    width: 50px;
  }

  &:nth-child(2) {
    padding-left: 30px;
    position: relative;
  }
}

.notes-cell {
  max-width: 300px;

  .notes-text {
    cursor: help;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    display: inline-block;
    max-width: 100%;
  }
}

.btn-edit {
  padding: 4px 8px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
    border-color: #9ca3af;
  }

  &:active {
    transform: scale(0.95);
  }
}

.notes-modal-overlay {
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
