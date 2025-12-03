<template>
  <div :class="['bed-slot', bedTypeClass, { occupied: isOccupied, warning: hasWarning }]" v-bind="dropzoneProps">
    <div class="bed-label">
      {{ bed.bedType }} {{ bed.position }}
    </div>
    <div v-if="assignedGuest" class="bed-assignment">
      <div class="assigned-guest" :data-guest-id="assignedGuest.id">
        <div class="guest-info">
          <strong>{{ displayName }}</strong>
          <span class="guest-details">
            {{ assignedGuest.gender }}, {{ assignedGuest.age }}
            <span v-if="assignedGuest.groupName" class="group-badge">
              {{ assignedGuest.groupName }}
            </span>
          </span>
        </div>
        <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
      </div>
    </div>
    <div v-else class="bed-empty">
      <span class="drop-hint">Drop guest here</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useUtils } from '@/shared/composables/useUtils'
import { ValidationWarning } from '@/shared/components'
import type { Bed } from '@/types'

interface Props {
  bed: Bed
}

const props = defineProps<Props>()

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const { useDroppableBed } = useDragDrop()
const { createDisplayName } = useUtils()

const assignedGuest = computed(() => {
  if (!props.bed.assignedGuestId) return null
  return guestStore.getGuestById(props.bed.assignedGuestId)
})

const isOccupied = computed(() => !!assignedGuest.value)

const displayName = computed(() => {
  if (!assignedGuest.value) return ''
  return createDisplayName(assignedGuest.value)
})

const warnings = computed(() => validationStore.getWarningsForBed(props.bed.bedId))

const hasWarning = computed(() => warnings.value.length > 0)

const bedTypeClass = computed(() => `bed-${props.bed.bedType}`)

function handleDrop(guestId: string, bedId: string) {
  assignmentStore.assignGuestToBed(guestId, bedId)
}

const dropzoneProps = useDroppableBed(props.bed.bedId, handleDrop)
</script>

<style scoped lang="scss">
.bed-slot {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 4px 8px;
  min-height: 28px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: white;
  transition: all 0.2s;

  &.drag-over {
    border-color: #3b82f6;
    background-color: #eff6ff;
    transform: scale(1.01);
  }

  &.occupied {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }

  &.warning {
    border-color: #fbbf24;
    background-color: #fffbeb;
  }

  &.bed-upper {
    border-left: 3px solid #3b82f6;
  }

  &.bed-lower {
    border-left: 3px solid #10b981;
  }

  &.bed-single {
    border-left: 3px solid #8b5cf6;
  }
}

.bed-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
  min-width: 70px;
  flex-shrink: 0;
}

.bed-assignment {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.assigned-guest {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.guest-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  strong {
    font-size: 0.8rem;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.guest-details {
  font-size: 0.7rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.group-badge {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.65rem;
  white-space: nowrap;
}

.bed-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.drop-hint {
  font-size: 0.7rem;
  color: #9ca3af;
  font-style: italic;
}
</style>
