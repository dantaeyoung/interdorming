<template>
  <tr
    :class="['guest-row', { 'picked-up': isPickedUp, 'has-suggestion': hasSuggestion }]"
    v-bind="draggableProps"
  >
    <td>
      <div class="name-cell">
        {{ displayName }}
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
    <td>
      <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import { useUtils } from '@/shared/composables/useUtils'
import { ValidationWarning } from '@/shared/components'
import type { Guest } from '@/types'

interface Props {
  guest: Guest
}

const props = defineProps<Props>()

const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const { createDisplayName } = useUtils()
const { useDraggableGuest } = useDragDrop()

const displayName = computed(() => createDisplayName(props.guest))

const isPickedUp = computed(() => assignmentStore.pickedUpGuestId === props.guest.id)

const hasSuggestion = computed(() => assignmentStore.suggestedAssignments.has(props.guest.id))

const warnings = computed(() => validationStore.getWarningsForGuest(props.guest.id))

const draggableProps = useDraggableGuest(props.guest.id)
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
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}
</style>
