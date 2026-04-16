<template>
  <div :class="['bed-slot', bedTypeClass, { occupied: isOccupied, warning: hasWarning, 'has-suggestion': isSuggestion, 'valid-drop-target': isValidDropTarget, 'invalid-drop-target': isInvalidDropTarget, 'is-pick-target': isPickingMode }]" v-bind="dropzoneProps" @click="handleBedClick">
    <div class="bed-label">
      {{ bed.position }} {{ bed.bedType }}
    </div>
    <div v-if="assignedGuest" class="bed-assignment">
      <div
        class="assigned-guest"
        :data-guest-id="assignedGuest.id"
        v-bind="draggableProps"
        @mouseenter="handleGuestHover"
        @mouseleave="handleGuestLeave"
      >
        <div class="guest-info">
          <strong class="guest-name">{{ displayName }}</strong>
          <span class="guest-details">
            <span class="guest-gender" :style="genderBackgroundStyle">{{ assignedGuest.gender }}</span>
            <span class="guest-age">{{ assignedGuest.age }}</span>
            <span v-if="needsLowerBunk" class="lower-bunk-icon" title="Needs lower/single bunk">🛏️</span>
            <span v-if="assignedGuest.groupName" class="group-badge clickable-group" @click.stop="handleGroupBadgeClick($event, assignedGuest.groupName)">
              {{ assignedGuest.groupName }}
            </span>
          </span>
          <span v-if="assignedGuest.arrival || assignedGuest.departure" class="date-info">
            <span v-if="assignedGuest.arrival">{{ assignedGuest.arrival }}</span>
            <span v-if="assignedGuest.arrival && assignedGuest.departure">→</span>
            <span v-if="assignedGuest.departure">{{ assignedGuest.departure }}</span>
          </span>
        </div>
        <div class="guest-actions">
          <button
            ref="notesButtonRef"
            class="icon-button notes-icon"
            :class="{ 'has-notes': hasNotes, 'no-notes': !hasNotes }"
            @click.stop
            @mouseenter="hasNotes && handleNotesMouseEnter()"
            @mouseleave="showNotesTooltip = false"
          >📝</button>
          <button
            class="icon-button edit-icon"
            title="View/Edit guest details"
            @click.stop="showEditModal = true"
          >✏️</button>
        </div>
        <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
      </div>
    </div>

    <div v-else-if="suggestedGuest" class="bed-suggestion">
      <div class="suggested-guest">
        <div class="guest-info">
          <strong class="guest-name">{{ suggestedDisplayName }}</strong>
          <span class="guest-details">
            <span class="guest-gender">{{ suggestedGuest.gender }}</span>
            <span class="guest-age">{{ suggestedGuest.age }}</span>
            <span v-if="suggestedGuest.groupName" class="group-badge clickable-group" @click.stop="handleGroupBadgeClick($event, suggestedGuest.groupName)">
              {{ suggestedGuest.groupName }}
            </span>
          </span>
          <span v-if="suggestedGuest.arrival || suggestedGuest.departure" class="date-info">
            <span v-if="suggestedGuest.arrival">{{ suggestedGuest.arrival }}</span>
            <span v-if="suggestedGuest.arrival && suggestedGuest.departure">→</span>
            <span v-if="suggestedGuest.departure">{{ suggestedGuest.departure }}</span>
          </span>
          <span class="suggestion-badge">Suggested</span>
        </div>
        <div class="suggestion-actions">
          <button @click="acceptSuggestion" class="btn-accept" title="Accept suggestion">
            ✓
          </button>
          <button @click="rejectSuggestion" class="btn-reject" title="Reject suggestion">
            ✗
          </button>
        </div>
      </div>
    </div>
    <div v-else class="bed-empty">
      <span class="drop-hint">Drop guest here</span>
    </div>

    <!-- Notes tooltip -->
    <Teleport to="body">
      <div v-if="showNotesTooltip" class="notes-tooltip-overlay" :style="tooltipPosition">
        {{ assignedGuest?.notes }}
      </div>
    </Teleport>

    <!-- Edit modal -->
    <GuestFormModal
      :show="showEditModal"
      :guest="assignedGuest || undefined"
      @close="showEditModal = false"
      @submit="handleGuestSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useGroupLinking } from '@/features/guests/composables/useGroupLinking'
import { useUtils } from '@/shared/composables/useUtils'
import { useDropValidation } from '@/shared/composables/useDropValidation'
import { parseLocalDate } from '@/shared/composables/useUtils'
import { ValidationWarning } from '@/shared/components'
import GuestFormModal from '@/features/guests/components/GuestFormModal.vue'
import type { Bed, Guest } from '@/types'

interface Props {
  bed: Bed
  viewDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  viewDate: null,
})

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const settingsStore = useSettingsStore()
const { useDroppableBed, useDraggableGuest, isDragging, draggedGuestId, isPicking, isPickingGroup, pickedGuestId, placeGuestOnBed, placeGroupOnBed, pickGroup } = useDragDrop()
const { setHoveredGroup, clearHoveredGroup } = useGroupLinking()
const { createFullName } = useUtils()
const { validateDrop } = useDropValidation()

const rawAssignedGuest = computed(() => {
  if (!props.bed.assignedGuestId) return null
  return guestStore.getGuestById(props.bed.assignedGuestId)
})

// When viewDate is set, only show guest if their stay includes that date
const assignedGuest = computed(() => {
  const guest = rawAssignedGuest.value
  if (!guest || !props.viewDate) return guest
  if (!guest.arrival || !guest.departure) return guest // Show if no dates set
  const vd = props.viewDate.getTime()
  const arrival = parseLocalDate(guest.arrival).getTime()
  const departure = parseLocalDate(guest.departure).getTime()
  // Departure day = guest leaves in the morning, bed is free that night
  return (vd >= arrival && vd < departure) ? guest : null
})

// Guest is assigned but filtered out by view date
const isFilteredByDate = computed(() => {
  return rawAssignedGuest.value && !assignedGuest.value
})

const suggestedGuest = computed(() => {
  const guestId = assignmentStore.suggestedBedToGuestMap.get(props.bed.bedId)
  return guestId ? guestStore.getGuestById(guestId) : null
})

const isSuggestion = computed(() => !!suggestedGuest.value)

const isOccupied = computed(() => !!assignedGuest.value)

const displayName = computed(() => {
  if (!assignedGuest.value) return ''
  return createFullName(assignedGuest.value)
})

const suggestedDisplayName = computed(() => {
  if (!suggestedGuest.value) return ''
  return createFullName(suggestedGuest.value)
})

const warnings = computed(() => validationStore.getWarningsForBed(props.bed.bedId))

const hasWarning = computed(() => warnings.value.length > 0)

const bedTypeClass = computed(() => `bed-${props.bed.bedType}`)

// Lower bunk indicator
const needsLowerBunk = computed(() => assignedGuest.value?.lowerBunk === true)

// Notes
const hasNotes = computed(() => !!assignedGuest.value?.notes?.trim())
const notesButtonRef = ref<HTMLButtonElement | null>(null)
const showNotesTooltip = ref(false)
const tooltipPosition = ref({ top: '0px', left: '0px' })

function handleNotesMouseEnter() {
  if (notesButtonRef.value) {
    const rect = notesButtonRef.value.getBoundingClientRect()
    tooltipPosition.value = {
      top: `${rect.bottom + 6}px`,
      left: `${Math.max(8, rect.right - 320)}px`,
    }
    showNotesTooltip.value = true
  }
}

// Edit modal
const showEditModal = ref(false)

function handleGuestSubmit(guestData: Partial<Guest>) {
  if (assignedGuest.value) {
    guestStore.updateGuest(assignedGuest.value.id, guestData)
  }
  showEditModal.value = false
}

// Gender-based background color for assigned guest
const genderBackgroundStyle = computed(() => {
  if (!assignedGuest.value) return {}
  const colors = settingsStore.settings.genderColors
  const gender = assignedGuest.value.gender.toLowerCase()
  let bgColor: string
  if (gender === 'm') {
    bgColor = colors.male
  } else if (gender === 'f') {
    bgColor = colors.female
  } else {
    bgColor = colors.nonBinary
  }
  return { backgroundColor: bgColor }
})

// Drop validity for visual feedback during drag or pick
const dropValidityResult = computed(() => {
  // Get the guest ID from either drag or pick mode
  const guestId = draggedGuestId.value || pickedGuestId.value

  // Only show validation when dragging or picking
  if ((!isDragging.value && !isPicking.value) || !guestId) {
    return null
  }
  return validateDrop(guestId, props.bed.bedId)
})

const isValidDropTarget = computed(() => {
  if (!dropValidityResult.value) return false
  return dropValidityResult.value.isValid
})

const isInvalidDropTarget = computed(() => {
  if (!dropValidityResult.value) return false
  return !dropValidityResult.value.isValid
})

// Check if we're in picking mode (for visual feedback)
const isPickingMode = computed(() => isPicking.value)

// Handle click to place picked guest or group
function handleBedClick() {
  if (isPickingGroup.value) {
    placeGroupOnBed(props.bed.bedId)
  } else if (isPicking.value) {
    placeGuestOnBed(props.bed.bedId)
  }
}

// Handle click on group badge to pick up the whole group
function handleGroupBadgeClick(event: MouseEvent, groupName: string) {
  const groupMembers = guestStore.guests.filter(g => g.groupName === groupName)
  if (groupMembers.length > 0) {
    pickGroup(groupMembers.map(g => g.id), event)
  }
}

// Handle hover for group highlighting
function handleGuestHover() {
  if (assignedGuest.value?.groupName) {
    setHoveredGroup(assignedGuest.value.groupName)
  }
}

function handleGuestLeave() {
  clearHoveredGroup()
}

// Make assigned guest draggable
const draggableProps = computed(() => {
  if (!assignedGuest.value) return {}
  return useDraggableGuest(assignedGuest.value.id)
})

function handleDrop(guestId: string, bedId: string) {
  // Check if the bed is already occupied
  const existingGuestId = props.bed.assignedGuestId

  if (existingGuestId && existingGuestId !== guestId) {
    // Bed is occupied by a different guest - swap them
    assignmentStore.swapGuests(guestId, existingGuestId)
  } else {
    // Bed is empty or same guest - just assign
    assignmentStore.assignGuestToBed(guestId, bedId)
  }
}

function acceptSuggestion() {
  if (suggestedGuest.value) {
    assignmentStore.acceptSuggestion(suggestedGuest.value.id)
  }
}

function rejectSuggestion() {
  if (suggestedGuest.value) {
    assignmentStore.suggestedAssignments.delete(suggestedGuest.value.id)
  }
}

const dropzoneProps = useDroppableBed(props.bed.bedId, handleDrop)
</script>

<style scoped lang="scss">
.bed-slot {
  padding: 2px 0px;
  min-height: 28px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &.is-pick-target {
    cursor: pointer;

    &:hover {
      background-color: #ecfdf5;
    }
  }
}

.bed-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
  min-width: 70px;
  flex-shrink: 0;
  padding-left: 4px;
  border-left: 3px solid transparent;

  .bed-slot.bed-upper & {
    border-left-color: #3b82f6;
  }

  .bed-slot.bed-lower & {
    border-left-color: #10b981;
  }

  .bed-slot.bed-single & {
    border-left-color: #8b5cf6;
  }
}

.bed-assignment {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  padding: 3px 8px;
  background: white;
  transition: all 0.2s;

  .bed-slot.occupied & {
    background-color: #f9fafb;
  }

  .bed-slot.warning & {
    border-color: #fbbf24;
    background-color: #fffbeb;
  }

  .bed-slot.drag-over & {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .bed-slot.valid-drop-target & {
    border-color: #22c55e;
    background-color: #dcfce7;
  }

  .bed-slot.invalid-drop-target & {
    border-color: #ef4444;
    background-color: #fee2e2;
  }
}

.assigned-guest {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: grab;
  transition: opacity 0.2s;

  &:active {
    cursor: grabbing;
  }

  &.dragging {
    opacity: 0.5;
  }
}

.guest-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.guest-name {
  font-size: 0.8rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 150px;
  max-width: 150px;
  flex-shrink: 0;
}

.guest-details {
  font-size: 0.7rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.guest-gender {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 600;
  color: #1f2937;
}

.guest-age {
  display: inline-block;
  min-width: 25px;
  text-align: right;
}

.group-badge {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.65rem;
  white-space: nowrap;

  &.clickable-group {
    cursor: grab;
    position: relative;

    &:hover {
      background-color: #fef3c7;
      color: #92400e;

      &::after {
        content: 'Click to pick up group';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 4px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 500;
        white-space: nowrap;
        z-index: 99999;
        pointer-events: none;
      }
    }
  }
}

.date-info {
  background-color: #f3f4f6;
  color: #4b5563;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.65rem;
  white-space: nowrap;
  margin-left: auto;
  flex-shrink: 0;
}

.bed-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border: 1px dashed #d1d5db;
  border-radius: 3px;
  padding: 3px 8px;
  background: #fafafa;
  transition: all 0.2s;

  .bed-slot.drag-over & {
    border-color: #3b82f6;
    border-style: solid;
    background-color: #eff6ff;
  }

  .bed-slot.valid-drop-target & {
    border-color: #22c55e;
    border-style: solid;
    background-color: #dcfce7;
  }

  .bed-slot.invalid-drop-target & {
    border-color: #ef4444;
    border-style: solid;
    background-color: #fee2e2;
  }
}

.guest-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 1px 3px;
  border-radius: 3px;
  opacity: 0.5;
  transition: opacity 0.2s;
  min-width: 20px;
  text-align: center;

  &:hover {
    opacity: 1;
    background: #f3f4f6;
  }

  &.no-notes {
    opacity: 0;
    cursor: default;
    pointer-events: none;
  }
}

.lower-bunk-icon {
  font-size: 0.65rem;
}

.drop-hint {
  font-size: 0.7rem;
  color: #9ca3af;
  font-style: italic;
}

.bed-filtered {
  background: #f9fafb;
  border-style: dotted;
}

.filtered-hint {
  color: #d1d5db;
  font-size: 0.65rem;
}

.bed-suggestion {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  border: 1px solid #93c5fd;
  border-radius: 3px;
  padding: 3px 8px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  opacity: 0.75;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    border-color: #3b82f6;
  }
}

.suggested-guest {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.suggestion-badge {
  display: inline-block;
  background-color: #3b82f6;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}

.suggestion-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.btn-accept,
.btn-reject {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 3px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }
}

.btn-accept {
  background-color: #10b981;
  color: white;

  &:hover {
    background-color: #059669;
  }
}

.btn-reject {
  background-color: #ef4444;
  color: white;

  &:hover {
    background-color: #dc2626;
  }
}
</style>

<style lang="scss">
.notes-tooltip-overlay {
  position: fixed;
  z-index: 99999;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
  color: #374151;
  max-width: 300px;
  white-space: pre-wrap;
  pointer-events: none;
}
</style>
