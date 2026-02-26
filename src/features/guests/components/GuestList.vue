<template>
  <div class="guest-list" v-bind="dropzoneProps">
    <div class="table-wrapper" ref="tableWrapperRef">
      <table class="table" ref="tableRef" @scroll="handleTableScroll">
        <thead>
          <tr>
          <th>Actions</th>
          <th @click="handleSort('importOrder')">
            #
            <SortIndicator :active="sortColumn === 'importOrder'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('firstName')">
            Name
            <SortIndicator :active="sortColumn === 'firstName'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('lastName')">
            Last Name
            <SortIndicator :active="sortColumn === 'lastName'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('gender')">
            Gender
            <SortIndicator :active="sortColumn === 'gender'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('age')">
            Age
            <SortIndicator :active="sortColumn === 'age'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('lowerBunk')">
            Lower Bunk
            <SortIndicator :active="sortColumn === 'lowerBunk'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('groupName')">
            Group
            <SortIndicator :active="sortColumn === 'groupName'" :direction="sortDirection" />
          </th>
          <th class="group-lines-header"></th>
          <th @click="handleSort('arrival')">
            Arrival
            <SortIndicator :active="sortColumn === 'arrival'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('departure')">
            Departure
            <SortIndicator :active="sortColumn === 'departure'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('indivGrp')">
            Indiv/Grp?
            <SortIndicator :active="sortColumn === 'indivGrp'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('notes')">
            Notes
            <SortIndicator :active="sortColumn === 'notes'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('email')">
            Email
            <SortIndicator :active="sortColumn === 'email'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('firstVisit')">
            First Visit
            <SortIndicator :active="sortColumn === 'firstVisit'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('roomPreference')">
            Rm Preference
            <SortIndicator :active="sortColumn === 'roomPreference'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('retreat')">
            Retreat
            <SortIndicator :active="sortColumn === 'retreat'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('ratePerNight')">
            Rate/Night
            <SortIndicator :active="sortColumn === 'ratePerNight'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('priceQuoted')">
            Price Quoted
            <SortIndicator :active="sortColumn === 'priceQuoted'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('amountPaid')">
            Amount Paid
            <SortIndicator :active="sortColumn === 'amountPaid'" :direction="sortDirection" />
          </th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        <GuestRow
          v-for="(guest, index) in guests"
          :key="guest.id"
          :guest="guest"
          :family-position="getFamilyPosition(guest, index)"
          :readonly="props.readonly"
          @edit="handleEditGuest"
        />
        <tr v-if="guests.length === 0" class="empty-row">
          <td colspan="20" class="empty-cell">
            <div class="empty-state-inline">
              <template v-if="guestStore.guests.length === 0">
                <strong>{{ emptyTitle }}</strong>
                <p>{{ emptyMessage }}</p>
              </template>
              <template v-else>
                <strong>All guests assigned</strong>
                <p>Drag guests here from room assignments to unassign them.</p>
              </template>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
      <GroupLinesOverlay
        v-if="guests.length > 0"
        :guests="guests"
        :row-positions="rowPositions"
        :suggested-groups="guestStore.suggestedGroups"
        :style="overlayStyle"
        class="group-lines-svg"
      />
      <!-- Per-group accept/reject pills for suggestions -->
      <div
        v-for="pill in suggestionPills"
        :key="'pill-' + pill.groupName"
        class="suggestion-pill"
        :style="{
          left: `${overlayLeft - scrollLeft + 32}px`,
          top: `${overlayTop + pill.y - 10}px`,
        }"
        @mouseenter="setHoveredGroup(pill.groupName)"
        @mouseleave="clearHoveredGroup()"
      >
        <button class="pill-accept" @click="guestStore.acceptGroupSuggestion(pill.groupName)" title="Accept group">
          &#10003;
        </button>
        <button class="pill-reject" @click="guestStore.rejectGroupSuggestion(pill.groupName)" title="Reject suggestion">
          &#10005;
        </button>
      </div>
    </div>

    <GuestFormModal :show="showModal" :guest="editingGuest" @close="handleCloseModal" @submit="handleSubmitGuest" />

    <!-- Cursor overlay during drag -->
    <Teleport to="body">
      <div v-if="isDragging" class="drag-cursor-overlay"></div>
    </Teleport>

    <!-- Floating blob for drag/pick preview -->
    <Teleport to="body">
      <div v-if="isFloatingBlobVisible" class="drag-floating-blob" :class="floatingBlobValidityClass" :style="floatingBlobStyle">
        <div class="floating-blob-content">
          <div class="guest-info-left">
            <span class="guest-name">{{ floatingBlobName }}</span>
          </div>
          <div class="guest-info-right">
            <span class="gender-badge" :style="{ backgroundColor: floatingBlobGenderColor }">{{ floatingBlobGenderCode }}</span>
            <span class="guest-age">{{ floatingBlobGuest?.age }}</span>
            <span class="lower-bunk-icon" :class="{ 'is-hidden': !floatingBlobGuest?.lowerBunk }">🛏️</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Group linking bar -->
    <Teleport to="body">
      <Transition name="link-bar">
        <div v-if="isLinking" class="group-linking-bar">
          <span class="linking-info">
            Linking {{ linkingCount }} guest{{ linkingCount === 1 ? '' : 's' }} — click guests to add/remove
          </span>
          <button class="btn-finish-group" :disabled="linkingCount < 2" @click="completeLinking()">
            Finish Group
          </button>
          <button class="btn-cancel-group" @click="cancelLinking">
            Cancel
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Group suggestion bar -->
    <Teleport to="body">
      <Transition name="link-bar">
        <div v-if="guestStore.hasGroupSuggestions && !isLinking" class="group-suggestion-bar">
          <span class="suggestion-info">
            {{ guestStore.groupSuggestionCount }} group suggestion{{ guestStore.groupSuggestionCount === 1 ? '' : 's' }} found
          </span>
          <button class="btn-accept-all" @click="guestStore.acceptAllGroupSuggestions()">
            Accept All ({{ guestStore.groupSuggestionCount }})
          </button>
          <button class="btn-clear-suggestions" @click="guestStore.clearGroupSuggestions()">
            Clear
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useSortConfig, type SortableField } from '@/shared/composables/useSortConfig'
import { useUtils } from '@/shared/composables/useUtils'
import { useDropValidation } from '@/shared/composables/useDropValidation'
import { useGroupLinking } from '@/features/guests/composables/useGroupLinking'
import GuestRow from './GuestRow.vue'
import GuestFormModal from './GuestFormModal.vue'
import GroupLinesOverlay from './GroupLinesOverlay.vue'
import type { Guest } from '@/types'

interface Props {
  showAssigned?: boolean
  emptyTitle?: string
  emptyMessage?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAssigned: false,
  emptyTitle: 'No guests loaded',
  emptyMessage: 'Upload a CSV file to begin assigning guests to dormitory beds.',
  readonly: false,
})

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const settingsStore = useSettingsStore()
const { createDisplayName } = useUtils()
const { validateDrop } = useDropValidation()
const { useDroppableUnassignedArea, isDragging, draggedGuestId, dragOverBedId, mousePosition, isPicking, pickedGuestId } = useDragDrop()
const { isLinking, linkingCount, completeLinking, cancelLinking, setHoveredGroup, clearHoveredGroup } = useGroupLinking()

// Template refs
const tableWrapperRef = ref<HTMLDivElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)

// Row positions for overlay
const rowPositions = ref<number[]>([])
const overlayLeft = ref(0)
const overlayTop = ref(0)

// Modal state
const showModal = ref(false)
const editingGuest = ref<Guest | undefined>(undefined)

const guests = computed(() => {
  const filtered = guestStore.filteredGuests

  if (props.showAssigned) {
    return filtered
  }

  // Show only unassigned guests
  return filtered.filter(g => !assignmentStore.assignments.has(g.id))
})

// Sort configuration
const { sortLevels, clearAllLevels, addLevel } = useSortConfig()

// Get the first sort level's column and direction for the header indicators
const sortColumn = computed(() => {
  if (sortLevels.value.length === 0) return null
  return sortLevels.value[0].field
})

const sortDirection = computed(() => {
  if (sortLevels.value.length === 0) return 'asc'
  return sortLevels.value[0].direction
})

function handleSort(column: keyof Guest) {
  // Check if this column is a valid sortable field
  const validFields: SortableField[] = [
    'firstName', 'lastName', 'preferredName', 'gender', 'age',
    'groupName', 'arrival', 'departure', 'retreat', 'ratePerNight',
    'priceQuoted', 'amountPaid', 'importOrder'
  ]

  if (!validFields.includes(column as SortableField)) {
    return
  }

  const sortableColumn = column as SortableField

  // If clicking the same column, toggle direction
  if (sortLevels.value.length === 1 && sortLevels.value[0].field === sortableColumn) {
    const currentDirection = sortLevels.value[0].direction
    clearAllLevels()
    addLevel(sortableColumn, currentDirection === 'asc' ? 'desc' : 'asc')
  } else {
    // Set new single-column sort
    clearAllLevels()
    addLevel(sortableColumn, 'asc')
  }
}

function handleUnassign(guestId: string) {
  assignmentStore.unassignGuest(guestId)
}

const dropzoneProps = useDroppableUnassignedArea(handleUnassign)

// Modal handlers
function handleAddGuest() {
  editingGuest.value = undefined
  showModal.value = true
}

function handleEditGuest(guest: Guest) {
  editingGuest.value = guest
  showModal.value = true
}

function handleCloseModal() {
  showModal.value = false
  editingGuest.value = undefined
}

function handleSubmitGuest(guestData: Partial<Guest>) {
  if (editingGuest.value) {
    // Update existing guest
    guestStore.updateGuest(editingGuest.value.id, guestData)
  } else {
    // Add new guest
    guestStore.addGuest(guestData)
  }
  handleCloseModal()
}

// Expose method to open add modal from parent
defineExpose({
  openAddModal: handleAddGuest,
})

// Overlay positioning
const scrollLeft = ref(0)

const overlayStyle = computed(() => ({
  left: `${overlayLeft.value - scrollLeft.value}px`,
  top: `${overlayTop.value}px`,
}))

function updateOverlayPosition() {
  if (!tableRef.value) return

  // Find the group-lines-header column to get its position
  const header = tableRef.value.querySelector('.group-lines-header') as HTMLElement
  if (header) {
    overlayLeft.value = header.offsetLeft
  }

  // Get the thead height for top offset
  const thead = tableRef.value.querySelector('thead') as HTMLElement
  if (thead) {
    overlayTop.value = thead.offsetHeight
  }

  // Measure actual row positions (center of each row) relative to tbody
  const tbody = tableRef.value.querySelector('tbody') as HTMLElement
  const rows = tableRef.value.querySelectorAll('tbody tr:not(.empty-row)')
  const positions: number[] = []
  const tbodyTop = tbody ? tbody.offsetTop : 0

  rows.forEach((row) => {
    const htmlRow = row as HTMLElement
    // Calculate center Y position relative to tbody (subtract tbody offset since SVG starts at tbody)
    const rowTop = htmlRow.offsetTop - tbodyTop
    const rowHeight = htmlRow.offsetHeight
    positions.push(rowTop + rowHeight / 2)
  })
  rowPositions.value = positions

  // Get current scroll position
  scrollLeft.value = tableRef.value.scrollLeft
}

// Handle table scroll to sync overlay
function handleTableScroll() {
  if (tableRef.value) {
    scrollLeft.value = tableRef.value.scrollLeft
  }
}

watch(guests, () => {
  nextTick(updateOverlayPosition)
})

// ResizeObserver to detect row height changes
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(updateOverlayPosition)
  // Re-measure on window resize
  window.addEventListener('resize', updateOverlayPosition)

  // Observe tbody for size changes (row height changes)
  if (tableRef.value) {
    const tbody = tableRef.value.querySelector('tbody')
    if (tbody) {
      resizeObserver = new ResizeObserver(() => {
        updateOverlayPosition()
      })
      resizeObserver.observe(tbody)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateOverlayPosition)
  resizeObserver?.disconnect()
})

// Family grouping logic
function getFamilyPosition(guest: Guest, index: number): 'none' | 'first' | 'middle' | 'last' | 'only' {
  if (!guest.groupName) return 'none'

  const familyMembers = guests.value.filter(g => g.groupName === guest.groupName)
  if (familyMembers.length === 1) return 'only'

  const familyIndices = familyMembers.map(member =>
    guests.value.findIndex(g => g.id === member.id)
  ).sort((a, b) => a - b)

  const positionInFamily = familyIndices.indexOf(index)

  if (positionInFamily === 0) return 'first'
  if (positionInFamily === familyIndices.length - 1) return 'last'
  return 'middle'
}

// Floating blob for drag/pick preview
const draggedGuest = computed(() => {
  if (!isDragging.value || !draggedGuestId.value) return null
  return guestStore.guests.find(g => g.id === draggedGuestId.value) || null
})

const pickedGuest = computed(() => {
  if (!isPicking.value || !pickedGuestId.value) return null
  return guestStore.guests.find(g => g.id === pickedGuestId.value) || null
})

// Use either dragged or picked guest for floating blob
const floatingBlobGuest = computed(() => draggedGuest.value || pickedGuest.value)
const isFloatingBlobVisible = computed(() => (isDragging.value && draggedGuest.value) || (isPicking.value && pickedGuest.value))

const floatingBlobName = computed(() => {
  if (!floatingBlobGuest.value) return ''
  return createDisplayName(floatingBlobGuest.value)
})

const floatingBlobGenderCode = computed(() => {
  if (!floatingBlobGuest.value) return ''
  return floatingBlobGuest.value.gender.charAt(0).toUpperCase()
})

const floatingBlobGenderColor = computed(() => {
  if (!floatingBlobGuest.value) return '#e5e7eb'
  const colors = settingsStore.settings.genderColors
  const gender = floatingBlobGuest.value.gender.toLowerCase()
  if (gender === 'm') return colors.male
  if (gender === 'f') return colors.female
  return colors.nonBinary
})

const floatingBlobStyle = computed(() => ({
  left: `${mousePosition.value.x}px`,
  top: `${mousePosition.value.y}px`,
}))

// Drop validity for visual feedback
const dropValidity = computed(() => {
  const guestId = draggedGuestId.value || pickedGuestId.value
  if ((!isDragging.value && !isPicking.value) || !guestId || !dragOverBedId.value) {
    return null // Not hovering over a bed
  }
  return validateDrop(guestId, dragOverBedId.value)
})

const floatingBlobValidityClass = computed(() => {
  if (!dropValidity.value) return ''
  return dropValidity.value.isValid ? 'is-valid-drop' : 'is-invalid-drop'
})

// Suggestion pills: position each at the first member's row Y
const suggestionPills = computed(() => {
  if (!guestStore.hasGroupSuggestions) return []

  const pills: Array<{ groupName: string, y: number }> = []
  const guestIndexMap = new Map<string, number>()
  guests.value.forEach((g, i) => guestIndexMap.set(g.id, i))

  guestStore.suggestedGroups.forEach((memberIds, groupName) => {
    let firstIndex = Infinity
    memberIds.forEach(id => {
      const idx = guestIndexMap.get(id)
      if (idx !== undefined && idx < firstIndex) firstIndex = idx
    })
    if (firstIndex === Infinity) return

    const y = rowPositions.value.length > firstIndex
      ? rowPositions.value[firstIndex]
      : (firstIndex * 49) + 24.5

    pills.push({ groupName, y })
  })

  return pills
})
</script>

<script lang="ts">
// SortIndicator component defined inline
import { defineComponent, h } from 'vue'

const SortIndicator = defineComponent({
  props: {
    active: Boolean,
    direction: String,
  },
  setup(props) {
    return () => {
      if (!props.active) return null
      return h('span', { class: 'sort-indicator active' }, props.direction === 'asc' ? '▲' : '▼')
    }
  },
})

export { SortIndicator }
</script>

<style scoped lang="scss">
.guest-list {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.drag-over {
    background-color: #f0f9ff;
    outline: 2px dashed #3b82f6;
    outline-offset: -2px;
  }
}

.table-wrapper {
  position: relative;
  flex: 1;
  overflow: auto; // Single scroll container for both axes

  // Always show scrollbars
  &::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
  }

  &::-webkit-scrollbar-track {
    background-color: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 6px;

    &:hover {
      background-color: #a8a8a8;
    }
  }

  // For Firefox
  scrollbar-width: auto;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.group-lines-svg {
  position: absolute;
  pointer-events: none;
  z-index: 5;
}

.empty-row {
  &:hover {
    background-color: transparent !important;
  }
}

.empty-cell {
  padding: 0 !important;
  border: none !important;
}

.empty-state-inline {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;

  strong {
    display: block;
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.suggestion-pill {
  position: absolute;
  display: flex;
  gap: 2px;
  z-index: 6;
  pointer-events: auto;

  button {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    transition: transform 0.1s, opacity 0.1s;

    &:hover {
      transform: scale(1.2);
    }
  }

  .pill-accept {
    background: #22c55e;
    color: white;

    &:hover {
      background: #16a34a;
    }
  }

  .pill-reject {
    background: #ef4444;
    color: white;

    &:hover {
      background: #dc2626;
    }
  }
}

.table {
  min-width: 2000px; // Wide enough for all columns - scroll handled by .table-wrapper
  border-collapse: separate;
  border-spacing: 0;
  background: white;

  thead,
  tbody,
  tr {
    table-layout: fixed;
  }

  thead {
    background-color: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 10;

    th {
      padding: 6px 10px;
      text-align: left;
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      background-color: #f9fafb;

      &:hover {
        background-color: #f3f4f6;
      }

      &:first-child {
        width: 100px;
      }

      &:nth-child(2) {
        width: 50px;
        text-align: center;
      }

      &.group-lines-header {
        width: 30px;
        min-width: 30px;
        max-width: 30px;
        padding: 0;
        cursor: default;

        &:hover {
          background-color: #f9fafb;
        }
      }
    }
  }

  tbody {
  }
}

.sort-indicator {
  margin-left: 4px;
  font-size: 0.75rem;
  color: #9ca3af;

  &.active {
    color: #3b82f6;
  }
}
</style>

<style lang="scss">
// Full-viewport overlay to force grabbing cursor during drag
.drag-cursor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99998;
  cursor: grabbing !important;
  pointer-events: none;
}

// Global cursor during drag
body.is-dragging {
  cursor: grabbing !important;

  * {
    cursor: grabbing !important;
  }
}

// Global cursor during pick mode
body.is-picking {
  cursor: pointer;
}

// Non-scoped styles for teleported floating blob
.drag-floating-blob {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  font-size: 0.75rem;
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
  cursor: grabbing;

  &.is-valid-drop {
    background: #dcfce7;
    border-color: #22c55e;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  &.is-invalid-drop {
    background: #fee2e2;
    border-color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .floating-blob-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .guest-info-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .guest-info-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .guest-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gender-badge {
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .guest-age {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .lower-bunk-icon {
    font-size: 0.6rem;
    opacity: 0.8;

    &.is-hidden {
      visibility: hidden;
    }
  }
}

// Group linking floating bar
.group-linking-bar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #1e3a5f;
  color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  z-index: 10000;
  font-size: 0.85rem;
  white-space: nowrap;

  .linking-info {
    font-weight: 500;
  }

  .btn-finish-group {
    padding: 6px 16px;
    border: none;
    border-radius: 6px;
    background: #22c55e;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #16a34a;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .btn-cancel-group {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: transparent;
    color: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.link-bar-enter-active,
.link-bar-leave-active {
  transition: all 0.25s ease;
}

.link-bar-enter-from,
.link-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

// Group suggestion floating bar
.group-suggestion-bar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #1e3a5f;
  color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  z-index: 10000;
  font-size: 0.85rem;
  white-space: nowrap;

  .suggestion-info {
    font-weight: 500;
  }

  .btn-accept-all {
    padding: 6px 16px;
    border: none;
    border-radius: 6px;
    background: #8b5cf6;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #7c3aed;
    }
  }

  .btn-clear-suggestions {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: transparent;
    color: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
