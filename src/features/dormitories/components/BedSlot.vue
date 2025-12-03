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
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  transition: all 0.2s;

  &.drag-over {
    border-color: #3b82f6;
    background-color: #eff6ff;
    transform: scale(1.02);
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
    border-left: 4px solid #3b82f6;
  }

  &.bed-lower {
    border-left: 4px solid #10b981;
  }

  &.bed-single {
    border-left: 4px solid #8b5cf6;
  }
}

.bed-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
}

.bed-assignment {
  flex: 1;
}

.assigned-guest {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guest-info {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 0.875rem;
    color: #1f2937;
  }
}

.guest-details {
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-badge {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
}

.bed-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.drop-hint {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}
</style>
