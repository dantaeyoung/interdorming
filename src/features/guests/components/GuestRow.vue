<template>
  <tr
    :class="['guest-row', { 'picked-up': isPickedUp, 'has-suggestion': hasSuggestion, 'link-target': isLinkTarget, 'group-highlight': isGroupHighlighted }]"
    v-bind="draggableProps"
    @click="handleRowClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <td class="actions-cell">
      <button
        @click.stop="handleStartLinking"
        class="btn-link-guest"
        :class="{ 'is-linking': isCurrentlyLinking, 'has-group': !!guest.groupName }"
        :title="isCurrentlyLinking ? 'Click another guest to link' : 'Link with another guest'"
      >
        🔗
      </button>
      <button
        v-if="guest.groupName"
        @click.stop="handleUnlink"
        class="btn-unlink-guest"
        title="Remove from group"
      >
        ⛓️‍💥
      </button>
      <button @click="handleEdit" class="btn-edit" title="Edit guest">
        ✎
      </button>
    </td>
    <td class="order-cell">{{ guest.importOrder || '-' }}</td>
    <td>
      <div class="name-cell">
        <span class="name-text">{{ displayName }}</span>
        <span v-if="hasSuggestion" class="suggestion-indicator" title="Has suggested placement">
          ✨
        </span>
      </div>
    </td>
    <td>{{ guest.lastName }}</td>
    <td>
      <span class="badge badge-gender" :style="genderBadgeStyle">
        {{ guest.gender }}
      </span>
    </td>
    <td>{{ guest.age }}</td>
    <td>
      <span v-if="guest.lowerBunk" class="badge badge-info">Yes</span>
      <span v-else class="text-muted">No</span>
    </td>
    <td class="group-cell" :class="{ 'long-group-name': guest.groupName && guest.groupName.length > 15 }">
      {{ guest.groupName || '-' }}
    </td>
    <td class="group-lines-cell">
      <!-- SVG overlay handles group line visualization -->
    </td>
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
import { useGroupLinking } from '../composables/useGroupLinking'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import { useSettingsStore } from '@/stores/settingsStore'
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

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const settingsStore = useSettingsStore()
const { createDisplayName } = useUtils()
const { useDraggableGuest } = useDragDrop()
const { isLinking, linkingGuestId, hoveredGroupName, startLinking, completeLinking, cancelLinking, setHoveredGroup, clearHoveredGroup } = useGroupLinking()

const displayName = computed(() => createDisplayName(props.guest))

// Gender badge style from settings
const genderBadgeStyle = computed(() => {
  const colors = settingsStore.settings.genderColors
  const gender = props.guest.gender.toLowerCase()
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

// Group linking computed
const isCurrentlyLinking = computed(() => linkingGuestId.value === props.guest.id)
const isLinkTarget = computed(() => isLinking.value && linkingGuestId.value !== props.guest.id)

// Group hover highlighting
const isGroupHighlighted = computed(() => {
  if (!props.guest.groupName || !hoveredGroupName.value) return false
  return props.guest.groupName === hoveredGroupName.value
})

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

function handleStartLinking() {
  if (isCurrentlyLinking.value) {
    // Cancel if clicking the same guest's link button
    cancelLinking()
  } else {
    startLinking(props.guest.id, displayName.value)
  }
}

function handleRowClick() {
  if (isLinkTarget.value) {
    completeLinking(props.guest.id)
  }
}

function handleMouseEnter() {
  if (props.guest.groupName) {
    setHoveredGroup(props.guest.groupName)
  }
}

function handleMouseLeave() {
  clearHoveredGroup()
}

function handleUnlink() {
  // Remove guest from their group
  guestStore.updateGuest(props.guest.id, { groupName: '' })
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

  &.link-target {
    cursor: pointer;
    background-color: #fef3c7;

    &:hover {
      background-color: #fde68a;
    }
  }

  &.group-highlight {
    background-color: #f0fdf4;

    .family-dot {
      transform: scale(1.3);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.4);
    }
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

.group-lines-cell {
  width: 30px;
  min-width: 30px;
  max-width: 30px;
  padding: 0 !important;
  position: relative;
}

.family-indicator {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 12px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    width: 2px;
    background-color: #ef4444;
    transform: translateX(-50%);
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

  &.badge-gender {
    color: #1f2937;
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
}

.group-cell {
  &.long-group-name {
    font-size: 0.7rem;
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

.actions-cell {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  vertical-align: middle;
  border-bottom: none;
}

.btn-link-guest {
  padding: 4px 6px;
  background: transparent;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fef3c7;
    color: #d97706;
    border-color: #fcd34d;
  }

  &.is-linking {
    background: #fde68a;
    color: #92400e;
    border-color: #f59e0b;
    animation: pulse-link 1s infinite;
  }

  &.has-group {
    background: #f0fdf4;
    color: #16a34a;
    border-color: #86efac;
  }
}

.btn-unlink-guest {
  padding: 4px 6px;
  background: transparent;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fca5a5;
  }
}

@keyframes pulse-link {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0);
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
