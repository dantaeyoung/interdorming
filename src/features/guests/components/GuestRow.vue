<template>
  <tr
    :class="['guest-row', { 'picked-up': isPickedUp, 'is-picked': isPicked, 'is-pick-target': isPickTarget, 'has-suggestion': hasSuggestion, 'link-target': isLinkTarget, 'selected-for-linking': isSelectedForLinking, 'group-highlight': isGroupHighlighted, 'group-dimmed': isGroupDimmed, 'is-unassigned': isUnassigned, 'non-assignable': !isAssignable, 'is-cancelled': guest.isCancelled }]"
    v-bind="draggableProps"
    @click="handleRowClick"
  >
    <td class="actions-cell">
      <button
        @click.stop="handleStartLinking"
        class="btn-link-guest"
        :class="{ 'is-linking': isSelectedForLinking, 'has-group': !!guest.groupName }"
        :title="isSelectedForLinking ? 'Selected for group' : isLinking ? 'Click to add to group' : 'Start group linking'"
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
      <button
        ref="actionNotesButtonRef"
        class="btn-notes-action"
        :class="{ 'has-notes': hasAnyNotes, 'no-notes-empty': !hasAnyNotes, 'has-internal': hasInternalNote }"
        @click.stop
        @mouseenter="hasAnyNotes && handleActionNotesMouseEnter()"
        @mouseleave="showActionNotesTooltip = false"
      >📝</button>
    </td>
    <template v-for="col in visibleColumns" :key="col.key">
      <td v-if="col.key === 'importOrder'" class="order-cell">{{ guest.importOrder || '-' }}</td>

      <td v-else-if="col.key === 'housingType'">
        <span v-if="guest.housingType" class="badge" :class="isAssignable ? 'badge-housing-assignable' : 'badge-housing-other'">
          {{ guest.housingType }}
        </span>
        <span v-else>-</span>
      </td>

      <td v-else-if="col.key === 'firstName'" :title="displayName">
        <div class="name-cell">
          <span class="name-text" :class="{ 'cancelled-name': guest.isCancelled }">{{ displayName }}</span>
          <span v-if="guest.isCancelled" class="cancelled-badge" title="Reservation cancelled in latest CSV — please review">CANCELLED</span>
          <span v-if="hasSuggestion" class="suggestion-indicator" title="Has suggested placement">
            ✨
          </span>
        </div>
      </td>

      <td v-else-if="col.key === 'gender'">
        <span class="badge badge-gender" :style="genderBadgeStyle">
          {{ guest.gender }}
        </span>
      </td>

      <td v-else-if="col.key === 'lowerBunk'">
        <span v-if="guest.lowerBunk" class="badge badge-info">Yes</span>
        <span v-else class="text-muted">No</span>
      </td>

      <td v-else-if="col.key === 'groupName'"
        class="group-cell"
        :class="{ 'has-group': !!guest.groupName && !readonly }"
        :title="guest.groupName || ''"
        @mouseenter="handleGroupCellMouseEnter"
        @mouseleave="handleGroupCellMouseLeave"
        @click.stop="handleGroupCellClick"
      >
        {{ guest.groupName || '-' }}
      </td>

      <td v-else-if="col.key === 'notes'" class="notes-cell">
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

      <td v-else-if="col.key === 'internalNotes'" class="notes-cell">
        <span
          v-if="guest.internalNotes"
          class="notes-text internal"
          @mouseenter="handleLongTextMouseEnter($event, guest.internalNotes)"
          @mouseleave="showLongTextModal = false"
        >
          {{ truncateNotes(guest.internalNotes) }}
        </span>
        <span v-else>-</span>
      </td>

      <td v-else-if="col.key === 'mentalHealth'" class="notes-cell">
        <span
          v-if="guest.mentalHealth"
          class="notes-text"
          @mouseenter="handleLongTextMouseEnter($event, guest.mentalHealth)"
          @mouseleave="showLongTextModal = false"
        >
          {{ truncateNotes(guest.mentalHealth) }}
        </span>
        <span v-else>-</span>
      </td>

      <td v-else-if="col.key === 'physicalHealth'" class="notes-cell">
        <span
          v-if="guest.physicalHealth"
          class="notes-text"
          @mouseenter="handleLongTextMouseEnter($event, guest.physicalHealth)"
          @mouseleave="showLongTextModal = false"
        >
          {{ truncateNotes(guest.physicalHealth) }}
        </span>
        <span v-else>-</span>
      </td>

      <td v-else-if="col.key === 'retreat'" class="retreat-cell">{{ guest.retreat || '-' }}</td>

      <td v-else-if="col.key === 'arrival' || col.key === 'departure'" class="date-cell">{{ formatGuestDate((guest as any)[col.key]) || '-' }}</td>

      <td v-else>{{ (guest as any)[col.key] || '-' }}</td>
    </template>
    <td
      class="group-lines-cell"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- SVG overlay handles group line visualization -->
    </td>
    <td>
      <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
    </td>

    <!-- Teleport notes modal to body -->
    <Teleport to="body">
      <div v-if="showNotesModal && guest.notes" class="notes-modal-overlay" :style="modalPosition" v-html="formatNotes(guest.notes)">
      </div>
      <div v-if="showLongTextModal && longTextModalContent" class="notes-modal-overlay" :style="longTextModalPosition" v-html="longTextModalContent">
      </div>
      <!-- Action-column notes hover popover: matches BedSlot styling so
           the operator gets a consistent experience whether the guest is
           assigned or unassigned. Two sections when both are present. -->
      <div
        v-if="showActionNotesTooltip"
        class="action-notes-tooltip-overlay"
        :style="actionNotesTooltipPosition"
      >
        <div v-if="guest.notes && guest.notes.trim()" class="notes-tooltip-section">
          <div class="notes-tooltip-label">Notes from guest</div>
          <div class="notes-tooltip-body">{{ guest.notes }}</div>
        </div>
        <div v-if="guest.internalNotes && guest.internalNotes.trim()" class="notes-tooltip-section">
          <div class="notes-tooltip-label">Internal</div>
          <div class="notes-tooltip-body">{{ guest.internalNotes }}</div>
        </div>
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
import { useUtils, formatGuestDate } from '@/shared/composables/useUtils'
import { ValidationWarning } from '@/shared/components'
import type { Guest, ColumnConfig } from '@/types'

interface Props {
  guest: Guest
  columns: ColumnConfig[]
  familyPosition?: 'none' | 'first' | 'middle' | 'last' | 'only'
  readonly?: boolean
}

interface Emits {
  (e: 'edit', guest: Guest): void
}

const props = withDefaults(defineProps<Props>(), {
  familyPosition: 'none',
  readonly: false,
})

const emit = defineEmits<Emits>()

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const validationStore = useValidationStore()
const settingsStore = useSettingsStore()
const { createDisplayName } = useUtils()
const { useDraggableGuest, pickGuest, pickGroup, isPicking, pickedGuestId, pickedGroupGuestIds } = useDragDrop()
const { isLinking, linkingGuestIds, hoveredGroupName, startLinking, toggleLinkingGuest, cancelLinking, setHoveredGroup, clearHoveredGroup } = useGroupLinking()

const visibleColumns = computed(() => props.columns.filter(c => c.visible))

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
const isSelectedForLinking = computed(() => linkingGuestIds.value.has(props.guest.id))
const isLinkTarget = computed(() => isLinking.value && !linkingGuestIds.value.has(props.guest.id))

// Group hover highlighting
const isGroupHighlighted = computed(() => {
  if (!hoveredGroupName.value) return false
  if (props.guest.groupName === hoveredGroupName.value) return true
  // Also highlight if this guest belongs to a suggested group being hovered
  const suggestedGroup = guestStore.getGuestSuggestedGroup(props.guest.id)
  return suggestedGroup === hoveredGroupName.value
})

// Dim rows not in the hovered group
const isGroupDimmed = computed(() => {
  if (!hoveredGroupName.value) return false
  return !isGroupHighlighted.value
})

const isPickedUp = computed(() => assignmentStore.pickedUpGuestId === props.guest.id)

// Check if this guest is picked in table view pick-and-place (single or group)
const isPicked = computed(() => pickedGuestId.value === props.guest.id || pickedGroupGuestIds.value.includes(props.guest.id))

// Check if we're in picking mode and this is a valid target (not the picked guest)
const isPickTarget = computed(() => isPicking.value && pickedGuestId.value !== props.guest.id)

const hasSuggestion = computed(() => assignmentStore.suggestedAssignments.has(props.guest.id))

const isUnassigned = computed(() => !assignmentStore.assignments.has(props.guest.id))
const isAssignable = computed(() => guestStore.isGuestAssignable(props.guest))

const warnings = computed(() => validationStore.getWarningsForGuest(props.guest.id))

const draggableProps = (props.readonly || !isAssignable.value) ? {} : useDraggableGuest(props.guest.id)

// Notes modal state
const showNotesModal = ref(false)
const modalPosition = ref({ top: '0px', left: '0px' })
const notesCellRef = ref<HTMLSpanElement | null>(null)

// Action-column notes button + hover popover (mirrors BedSlot)
const hasInternalNote = computed(() => !!props.guest.internalNotes?.trim())
const hasAnyNotes = computed(
  () => !!props.guest.notes?.trim() || hasInternalNote.value
)
const actionNotesButtonRef = ref<HTMLButtonElement | null>(null)
const showActionNotesTooltip = ref(false)
const actionNotesTooltipPosition = ref({ top: '0px', left: '0px' })

function handleActionNotesMouseEnter() {
  if (!actionNotesButtonRef.value) return
  const rect = actionNotesButtonRef.value.getBoundingClientRect()
  // Anchor below the icon, clamped to viewport
  const tooltipWidth = 320
  const left = Math.max(
    8,
    Math.min(window.innerWidth - tooltipWidth - 8, rect.left)
  )
  actionNotesTooltipPosition.value = {
    top: `${rect.bottom + 6}px`,
    left: `${left}px`,
  }
  showActionNotesTooltip.value = true
}

// Generic long text modal (for mental health, physical health, etc.)
const showLongTextModal = ref(false)
const longTextModalPosition = ref({ top: '0px', left: '0px' })
const longTextModalContent = ref('')

function truncateNotes(notes: string, maxLength: number = 50): string {
  if (notes.length <= maxLength) return notes
  return notes.substring(0, maxLength) + '...'
}

function formatNotes(notes: string): string {
  // Escape HTML entities first for safety, then convert <br /> variants to actual line breaks
  const escaped = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/&lt;br\s*\/?\s*&gt;/gi, '<br>')
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

function handleLongTextMouseEnter(event: MouseEvent, text: string) {
  const target = event.target as HTMLElement
  if (target) {
    const rect = target.getBoundingClientRect()
    longTextModalPosition.value = {
      top: `${rect.top}px`,
      left: `${rect.left + rect.width / 2}px`,
    }
  }
  longTextModalContent.value = formatNotes(text)
  showLongTextModal.value = true
}

function handleEdit() {
  emit('edit', props.guest)
}


function handleStartLinking() {
  if (!isLinking.value) {
    // Start a new linking session with this guest
    startLinking(props.guest.id, displayName.value)
  } else {
    // Toggle this guest in/out of the linking selection
    toggleLinkingGuest(props.guest.id)
  }
}

function handleGroupCellMouseEnter() {
  handleMouseEnter()
}

function handleGroupCellMouseLeave() {
  handleMouseLeave()
}

function handleGroupCellClick(event: MouseEvent) {
  if (!props.guest.groupName || props.readonly) return
  // Find all guests in this group and pick them up
  const groupMembers = guestStore.guests.filter(g => g.groupName === props.guest.groupName)
  if (groupMembers.length > 0) {
    pickGroup(groupMembers.map(g => g.id), event)
  }
}

function handleRowClick(event: MouseEvent) {
  // Handle group linking first - clicking a row toggles it in the selection
  if (isLinkTarget.value) {
    toggleLinkingGuest(props.guest.id)
    return
  }

  // Handle pick-and-place (disabled in readonly mode or non-assignable guests)
  if (!props.readonly && isAssignable.value) {
    pickGuest(props.guest.id, event)
  }
}

function handleMouseEnter() {
  if (props.guest.groupName) {
    setHoveredGroup(props.guest.groupName)
  } else {
    const suggestedGroup = guestStore.getGuestSuggestedGroup(props.guest.id)
    if (suggestedGroup) {
      setHoveredGroup(suggestedGroup)
    }
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
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;

  &:hover {
    background-color: #f9fafb;
  }

  /* Cancelled-reservation row: faded out (matches the camping/commuter
     visual treatment) so unassigned active guests visually pop, AND
     every cell's text is struck through. Coloured badges go monochrome
     via grayscale so they don't draw the eye. */
  &.is-cancelled {
    opacity: 0.45;
    cursor: default;

    td {
      text-decoration: line-through;
      text-decoration-color: #6b7280;
    }

    .badge {
      filter: grayscale(1);
    }

    /* The CANCELLED tag itself should NOT be struck through — it's
       the label explaining the row's state. !important wins over the
       td-level rule above + some browsers' inheritance quirks for
       text-decoration cascading into inline-block children. */
    .cancelled-badge {
      text-decoration: none !important;
    }

    &:hover {
      background-color: inherit;
    }
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
    cursor: grabbing;
  }

  &.is-picked {
    background-color: #fef3c7;
    border: 2px dashed #f59e0b;
    opacity: 0.7;
  }

  &.is-pick-target {
    cursor: pointer;

    &:hover {
      background-color: #ecfdf5;
    }
  }

  &.selected-for-linking {
    background-color: #dbeafe;
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
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

  &.group-dimmed {
    opacity: 0.25;
  }

  &.is-unassigned {
    background: #e5e7eb;
    border: 1px solid #9ca3af;
    border-radius: 6px;
    margin: 3px 0;

    td {
      background: transparent;
      border-bottom: none;
    }

    td:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    td:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }

  &.non-assignable {
    opacity: 0.45;
    cursor: default;

    &:hover {
      background-color: inherit;
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

  &.cancelled-name {
    text-decoration: line-through;
    color: #9ca3af;
  }
}

.cancelled-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
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

  &.badge-housing-assignable {
    background-color: #dbeafe;
    color: #1e40af;
  }

  &.badge-housing-other {
    background-color: #fef3c7;
    color: #92400e;
  }
}

.text-muted {
  color: #9ca3af;
}

td {
  padding: 1px 6px;
  /* Visible row separator. Earlier this was \`border-bottom\` on td, but
     at the new compact density the e5e7eb hairline disappears against
     the white background. Use a slightly darker grey, applied with the
     `box-shadow` trick so it isn't swallowed by `border-collapse`
     edge-stacking when sibling cells render. */
  box-shadow: inset 0 -1px 0 #d1d5db;
  font-size: 0.8rem;
  line-height: 1.25;
  /* Lock every cell to a single line + a uniform baseline. Long values
     (group names, emails, etc.) get truncated with an ellipsis and the
     native `title` attribute (or richer tooltip in special cells)
     reveals the full text on hover. */
  height: 24px;
  max-height: 24px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  vertical-align: middle;

  &.order-cell {
    font-weight: 600;
    color: #6b7280;
    text-align: center;
    width: 50px;
  }
}

tr.guest-row {
  height: 24px;
}

.group-cell {
  &.long-group-name {
    font-size: 0.7rem;
  }

  &.has-group {
    cursor: grab;
    position: relative;

    &:hover {
      background-color: #fef3c7;

      &::after {
        content: 'Click to pick up group';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
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

.retreat-cell {
  min-width: 200px;
}

.date-cell {
  white-space: nowrap;
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

    &.internal {
      color: #92400e;
      background: #fef3c7;
      padding: 0 4px;
      border-radius: 3px;
    }
  }
}

.actions-cell {
  /* Important: NOT display:flex on the td itself — that detaches the
     cell from the row's vertical-alignment system and the buttons
     end up offset against the data cells. The buttons inside are
     already inline-flex and they line up naturally with normal cell
     layout + vertical-align: middle. */
  white-space: nowrap;
  min-width: 100px;
  vertical-align: middle;
  height: 24px;
  max-height: 24px;
  overflow: hidden;

  > * + * {
    margin-left: 2px;
  }
}

.btn-link-guest {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 5px;
  background: transparent;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  font-size: 0.75rem;
  line-height: 1;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 5px;
  background: transparent;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  font-size: 0.7rem;
  line-height: 1;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 6px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 0.8rem;
  line-height: 1;
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

/* Notes icon in the actions column — mirrors BedSlot's leading notes
   button so the hover experience is identical for assigned and
   unassigned guests. */
.btn-notes-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0 4px;
  border-radius: 3px;
  opacity: 1;
  line-height: 1;
  transition: opacity 0.2s;
  position: relative;

  &:hover {
    background: #f3f4f6;
  }

  /* Very faded, non-interactive when the guest has no notes — present
     in the row so the column width stays consistent, but visually
     distinct from rows that do have notes. */
  &.no-notes-empty {
    opacity: 0.18;
    cursor: default;
    pointer-events: none;
  }

  /* Amber dot in the upper-right when internal notes exist. */
  &.has-internal::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 6px;
    background: #5b21b6;
    border-radius: 50%;
    border: 1px solid white;
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

<style lang="scss">
/* Action-column notes popover. Lives at body level so the table's
   overflow can't clip it. Mirrors the BedSlot notes tooltip styling. */
.action-notes-tooltip-overlay {
  position: fixed;
  z-index: 99999;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
  color: #374151;
  max-width: 320px;
  white-space: pre-wrap;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .notes-tooltip-section + .notes-tooltip-section {
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
  }

  .notes-tooltip-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
    margin-bottom: 4px;
  }

  .notes-tooltip-body {
    color: #374151;
  }
}
</style>
