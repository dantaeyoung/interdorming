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
          <th @click="handleSort('firstVisit')">
            First Visit
            <SortIndicator :active="sortColumn === 'firstVisit'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('roomPreference')">
            Rm Preference
            <SortIndicator :active="sortColumn === 'roomPreference'" :direction="sortDirection" />
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
          @edit="handleEditGuest"
        />
        <tr v-if="guests.length === 0" class="empty-row">
          <td colspan="19" class="empty-cell">
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
        :style="overlayStyle"
        class="group-lines-svg"
      />
    </div>

    <GuestFormModal :show="showModal" :guest="editingGuest" @close="handleCloseModal" @submit="handleSubmitGuest" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import { useSortConfig, type SortableField } from '@/shared/composables/useSortConfig'
import GuestRow from './GuestRow.vue'
import GuestFormModal from './GuestFormModal.vue'
import GroupLinesOverlay from './GroupLinesOverlay.vue'
import type { Guest } from '@/types'

interface Props {
  showAssigned?: boolean
  emptyTitle?: string
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  showAssigned: false,
  emptyTitle: 'No guests loaded',
  emptyMessage: 'Upload a CSV file to begin assigning guests to dormitory beds.',
})

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const { useDroppableUnassignedArea } = useDragDrop()

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
  overflow: auto;
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

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  display: block;

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

  thead,
  tbody,
  tr {
    display: table;
    width: 100%;
    min-width: 2000px; // Ensure table is wide enough for all columns
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
