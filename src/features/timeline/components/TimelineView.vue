<template>
  <div class="timeline-view">
    <TimelineHeader />

    <div class="timeline-content-wrapper" :style="{ '--column-width': `${columnWidthPx}px` }">
      <!-- Sticky Header -->
      <div class="timeline-header-section">
        <table class="timeline-table">
          <colgroup>
            <col style="width: 40px; min-width: 40px; max-width: 40px;" />
            <col style="width: 100px; min-width: 100px; max-width: 100px;" />
            <col style="width: 100px; min-width: 100px; max-width: 100px;" />
            <col
              v-for="dateCol in dateColumns"
              :key="`col-${dateCol.index}`"
              :style="{ width: `${columnWidthPx}px`, minWidth: `${columnWidthPx}px`, maxWidth: `${columnWidthPx}px` }"
            />
          </colgroup>
          <thead>
            <!-- Month row -->
            <tr>
              <th class="dorm-header" rowspan="2"><div class="rotated-text">Dormitory</div></th>
              <th class="room-header" rowspan="2">Room</th>
              <th class="bed-header" rowspan="2">Bed</th>
              <th
                v-for="monthGroup in monthGroups"
                :key="`${monthGroup.year}-${monthGroup.month}`"
                :colspan="monthGroup.colspan"
                class="month-header"
              >
                {{ monthGroup.month }}
              </th>
            </tr>
            <!-- Day row -->
            <tr>
              <th
                v-for="dateCol in dateColumns"
                :key="dateCol.index"
                class="date-header"
                :class="{ 'is-sunday': dateCol.date.getDay() === 0 }"
                :title="dateCol.fullLabel"
              >
                <div class="date-cell">
                  <div class="weekday">{{ dateCol.weekday }}</div>
                  <div class="day">{{ dateCol.date.getDate() }}</div>
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <!-- Unassigned Guests Section - Independently Scrollable -->
      <div class="unassigned-section" :style="{ height: `${unassignedSectionHeight}px` }">
        <!-- Fixed label on the left -->
        <div class="unassigned-label-fixed">
          <span>Unassigned Guests</span>
        </div>
        <!-- Scrollable content area -->
        <div class="unassigned-scrollable" ref="unassignedSectionRef">
          <table class="timeline-table unassigned-table">
            <colgroup>
              <col
                v-for="dateCol in dateColumns"
                :key="`col-unassigned-${dateCol.index}`"
                :style="{ width: `${columnWidthPx}px`, minWidth: `${columnWidthPx}px`, maxWidth: `${columnWidthPx}px` }"
              />
            </colgroup>
            <tbody>
            <!-- Unassigned Guests Section - Scrollable Stacked Blobs -->
            <tr class="unassigned-row">
              <!-- Individual date cells to maintain grid alignment -->
              <td
                v-for="dateCol in dateColumns"
                :key="`unassigned-${dateCol.index}`"
                class="unassigned-date-cell"
                :class="{
                  'valid-drop-cell': isValidDropCell('unassigned', dateCol.index)
                }"
                @dragover.prevent="onDragOver('unassigned')"
                @dragleave="onDragLeave"
                @drop="onDrop('unassigned')"
                @click="onBedCellClick('unassigned')"
                @mouseenter="onCellMouseEnter('unassigned')"
                @mouseleave="onCellMouseLeave"
              >
                <!-- Render blobs that start in this column -->
                <div
                  v-for="(blob, index) in unassignedGuestBlobs.filter(b => b.startColIndex === dateCol.index)"
                  :key="blob.guestId"
                  class="unassigned-blob-wrapper"
                  :style="{
                    position: 'absolute',
                    top: `${2 + unassignedGuestBlobs.indexOf(blob) * 25}px`,
                    left: '0',
                    width: `calc(${blob.spanCount * 100}% + ${(blob.spanCount - 1) * 1}px)`,
                    height: '30px',
                    zIndex: unassignedGuestBlobs.length - unassignedGuestBlobs.indexOf(blob)
                  }"
                >
                  <GuestBlob
                    :guest-blob="blob"
                    :is-picked="checkIsGuestPicked(blob.guestId)"
                    @drag-start="onGuestDragStart"
                    @drag-end="onGuestDragEnd"
                    @edit-guest="onEditGuest"
                    @pick="onGuestPick"
                  />
                </div>

                <!-- Ghost preview for drop target -->
                <div
                  v-if="getGhostPreview('unassigned', dateCol.index)"
                  class="ghost-preview"
                  :class="{ 'has-warning': wouldHaveWarnings('unassigned') }"
                  :style="getGhostPreviewStyle(getGhostPreview('unassigned', dateCol.index)!)"
                >
                  <div class="ghost-text">
                    <span v-if="wouldHaveWarnings('unassigned')" class="warning-emoji">⚠️</span>
                    <span>{{ getGhostFullName(getGhostPreview('unassigned', dateCol.index)!) }}</span>
                  </div>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Resizable Divider -->
      <div
        class="section-divider"
        @mousedown="startResize"
      >
        <div class="divider-handle"></div>
      </div>

      <!-- Dorms Section - Independently Scrollable -->
      <div class="dorms-section" ref="dormsSectionRef">
        <table class="timeline-table">
          <colgroup>
            <col style="width: 40px; min-width: 40px; max-width: 40px;" />
            <col style="width: 100px; min-width: 100px; max-width: 100px;" />
            <col style="width: 100px; min-width: 100px; max-width: 100px;" />
            <col
              v-for="dateCol in dateColumns"
              :key="`col-dorms-${dateCol.index}`"
              :style="{ width: `${columnWidthPx}px`, minWidth: `${columnWidthPx}px`, maxWidth: `${columnWidthPx}px` }"
            />
          </colgroup>
          <tbody>
          <!-- Regular bed rows -->
          <tr
            v-for="(bedRow, index) in bedRows"
            :key="bedRow.bed.id"
            class="bed-row"
            :class="{
              collapsed: bedRow.isCollapsed,
              'room-stripe-dark': isRoomStripeDark(index),
              'room-stripe-light': !isRoomStripeDark(index),
              'has-conflict': bedHasAnyConflict(bedRow.bed.id)
            }"
          >
            <!-- Dormitory label - only show on first bed of dormitory -->
            <td
              v-if="shouldShowDormLabel(index)"
              class="dorm-label"
              :rowspan="getDormRowspan(index)"
              :style="{ backgroundColor: bedRow.dormitory.color || '#f9fafb' }"
            >
              <div class="rotated-text">{{ bedRow.dormitory.name }}</div>
            </td>

            <!-- Room label - only show on first bed of room -->
            <td
              v-if="shouldShowRoomLabel(index)"
              class="room-label"
              :rowspan="getRoomRowspan(index)"
              :style="getRoomStyle(bedRow)"
            >
              <div class="room-content">
                <span>{{ bedRow.room.name }}</span>
                <span class="room-gender-badge" :class="`gender-${bedRow.room.gender}`">
                  {{ getRoomGenderCode(bedRow.room.gender) }}
                </span>
                <button
                  v-if="getRoomSuggestionCount(bedRow.dormitory.name, bedRow.room.name) > 0"
                  @click="handleAcceptRoomSuggestions(bedRow.dormitory.name, bedRow.room.name)"
                  class="room-accept-btn"
                  title="Accept all suggestions for this room"
                >
                  Accept ({{ getRoomSuggestionCount(bedRow.dormitory.name, bedRow.room.name) }})
                </button>
                <button
                  v-if="roomHasAvailableBeds(bedRow.dormitory.name, bedRow.room.name)"
                  @click="handleAutoPlaceRoom(bedRow.dormitory.name, bedRow.room.name)"
                  class="room-auto-place-btn"
                  title="Auto-place guests in this room only"
                >
                  Auto-place
                </button>
              </div>
            </td>

            <!-- Bed label -->
            <td class="bed-label" :class="{ 'has-conflict': bedHasAnyConflict(bedRow.bed.id) }">
              {{ bedRow.bed.bedNumber }} ({{ bedRow.bed.bedType }})
            </td>

            <!-- Date cells -->
            <td
              v-for="dateCol in dateColumns"
              :key="`${bedRow.bed.id}-${dateCol.index}`"
              class="guest-cell"
              :class="{
                'drop-target': isDropTarget(bedRow.bed.id),
                'valid-drop-cell': isValidDropCell(bedRow.bed.id, dateCol.index),
                conflict: hasConflict(bedRow.bed.id, dateCol.date),
              }"
              @dragover.prevent="onDragOver(bedRow.bed.id)"
              @dragleave="onDragLeave"
              @drop="onDrop(bedRow.bed.id)"
              @click="onBedCellClick(bedRow.bed.id)"
              @mouseenter="onCellMouseEnter(bedRow.bed.id)"
              @mouseleave="onCellMouseLeave"
            >
              <!-- Render guest blob if this is the starting column -->
              <GuestBlob
                v-for="blob in getGuestBlobsForCell(bedRow.bed.id, dateCol.index)"
                :key="blob.guestId"
                :guest-blob="blob"
                :is-picked="checkIsGuestPicked(blob.guestId)"
                :has-conflict="bedHasAnyConflict(bedRow.bed.id)"
                :stack-position="blob.stackPosition"
                :stack-count="blob.stackCount"
                @drag-start="onGuestDragStart"
                @drag-end="onGuestDragEnd"
                @edit-guest="onEditGuest"
                @pick="onGuestPick"
              />

              <!-- Ghost preview for drop target -->
              <div
                v-if="getGhostPreview(bedRow.bed.id, dateCol.index)"
                class="ghost-preview"
                :class="{ 'has-warning': wouldHaveWarnings(bedRow.bed.id) }"
                :style="getGhostPreviewStyle(getGhostPreview(bedRow.bed.id, dateCol.index)!)"
              >
                <span class="ghost-text">
                  <span v-if="wouldHaveWarnings(bedRow.bed.id)" class="warning-emoji">⚠️</span>
                  {{ getGhostFullName(getGhostPreview(bedRow.bed.id, dateCol.index)!) }}
                </span>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="bedRows.length === 0" class="empty-state">
      <p>No dormitories configured. Please add rooms and beds in the Room Configuration tab.</p>
    </div>

    <div v-if="dateColumns.length === 0" class="empty-state">
      <p>No date range selected. Please configure the date range above.</p>
    </div>

    <!-- Guest Edit Modal -->
    <GuestFormModal
      :show="showGuestModal"
      :guest="selectedGuest"
      @close="closeGuestModal"
      @submit="handleGuestUpdate"
    />

    <!-- Notes Tooltip Overlay (teleported from GuestBlob components) -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTimelineData } from '../composables/useTimelineData'
import { useTimelineDragDrop } from '../composables/useTimelineDragDrop'
import { useTimelineStore } from '@/stores/timelineStore'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAutoPlacement } from '@/features/assignments/composables/useAutoPlacement'
import { useSortConfig } from '@/shared/composables/useSortConfig'
import TimelineHeader from './TimelineHeader.vue'
import GuestBlob from './GuestBlob.vue'
import { GuestFormModal } from '@/features/guests/components'
import type { GuestBlobData } from '../types/timeline'
import type { Guest } from '@/types'

const timelineStore = useTimelineStore()
const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const dormitoryStore = useDormitoryStore()
const { autoPlaceGuestsInRoom } = useAutoPlacement()
const { sortGuests } = useSortConfig()
const { dateColumns, monthGroups, bedRows, getGuestBlobsForBed } = useTimelineData()
const {
  startDrag,
  endDrag,
  enterDropTarget,
  leaveDropTarget,
  dropOnBed,
  isDropTarget: checkIsDropTarget,
  getDraggedGuestId,
  dragState,
  // Pick-to-place functions
  pickState,
  pickGuest,
  placeGuest,
  isGuestPicked,
  getPickedGuestId,
  hasPickedGuest,
  enterPickTarget,
  leavePickTarget,
  isPickHoverTarget,
  setupKeyboardListener,
  cleanupKeyboardListener,
} = useTimelineDragDrop()

// Column width in pixels (directly from slider, 10-100px)
const columnWidthPx = computed(() => timelineStore.columnWidth)

// Refs for scroll synchronization
const unassignedSectionRef = ref<HTMLElement | null>(null)
const dormsSectionRef = ref<HTMLElement | null>(null)

// Resizable section height
const unassignedSectionHeight = ref(200)
const isResizing = ref(false)
const resizeStartY = ref(0)
const resizeStartHeight = ref(0)

// Resize handlers
function startResize(event: MouseEvent) {
  isResizing.value = true
  resizeStartY.value = event.clientY
  resizeStartHeight.value = unassignedSectionHeight.value

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onResize(event: MouseEvent) {
  if (!isResizing.value) return

  const delta = event.clientY - resizeStartY.value
  const newHeight = Math.max(100, Math.min(500, resizeStartHeight.value + delta))
  unassignedSectionHeight.value = newHeight
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Synchronize horizontal scrolling between sections
let isScrolling = false // Prevent infinite loop

function syncHorizontalScroll(source: HTMLElement, target: HTMLElement) {
  if (isScrolling) return
  isScrolling = true
  target.scrollLeft = source.scrollLeft
  requestAnimationFrame(() => {
    isScrolling = false
  })
}

onMounted(() => {
  // Setup keyboard listener for Escape key to cancel pick
  setupKeyboardListener()

  if (unassignedSectionRef.value && dormsSectionRef.value) {
    const unassigned = unassignedSectionRef.value
    const dorms = dormsSectionRef.value

    const unassignedScrollHandler = () => syncHorizontalScroll(unassigned, dorms)
    const dormsScrollHandler = () => syncHorizontalScroll(dorms, unassigned)

    unassigned.addEventListener('scroll', unassignedScrollHandler)
    dorms.addEventListener('scroll', dormsScrollHandler)

    // Cleanup
    onUnmounted(() => {
      unassigned.removeEventListener('scroll', unassignedScrollHandler)
      dorms.removeEventListener('scroll', dormsScrollHandler)
      // Cleanup resize listeners if still active
      document.removeEventListener('mousemove', onResize)
      document.removeEventListener('mouseup', stopResize)
      // Cleanup keyboard listener
      cleanupKeyboardListener()
    })
  }
})

// Get unassigned guests and generate blobs for them
const unassignedGuestBlobs = computed((): GuestBlobData[] => {
  const blobs: GuestBlobData[] = []
  const rangeStart = new Date(timelineStore.config.dateRangeStart)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(timelineStore.config.dateRangeEnd)
  rangeEnd.setHours(0, 0, 0, 0)

  // Get unassigned guests as Guest objects and sort them
  const unassignedGuests = assignmentStore.unassignedGuestIds
    .map(guestId => guestStore.getGuestById(guestId))
    .filter((guest): guest is Guest => guest !== undefined)

  // Apply the same sort as Table View
  const sortedUnassignedGuests = sortGuests(unassignedGuests)

  sortedUnassignedGuests.forEach(guest => {
    // Skip if guest has a suggested assignment (they'll show in the bed row instead)
    if (assignmentStore.suggestedAssignments.has(guest.id)) return

    // Only show guests with arrival/departure dates
    if (!guest.arrival || !guest.departure) return

    const arrival = new Date(guest.arrival)
    arrival.setHours(0, 0, 0, 0)
    const departure = new Date(guest.departure)
    departure.setHours(0, 0, 0, 0)

    // Skip if guest stay doesn't overlap with visible range
    if (departure < rangeStart || arrival > rangeEnd) return

    // Find start and end column indices
    const arrivalTime = arrival.getTime()
    const departureTime = departure.getTime()

    const startColIndex = dateColumns.value.findIndex(col => {
      const colDate = new Date(col.date)
      colDate.setHours(0, 0, 0, 0)
      return colDate.getTime() === arrivalTime
    })

    const endColIndex = dateColumns.value.findIndex(col => {
      const colDate = new Date(col.date)
      colDate.setHours(0, 0, 0, 0)
      return colDate.getTime() === departureTime
    })

    // Clamp to visible range
    const visibleStartIndex = Math.max(0, startColIndex === -1 ? 0 : startColIndex)
    const visibleEndIndex = Math.min(
      dateColumns.value.length - 1,
      endColIndex === -1 ? dateColumns.value.length - 1 : endColIndex
    )

    const spanCount = visibleEndIndex - visibleStartIndex + 1

    blobs.push({
      guestId: guest.id,
      displayName: guest.preferredName || guest.firstName,
      bedId: 'unassigned',
      startColIndex: visibleStartIndex,
      endColIndex: visibleEndIndex,
      spanCount,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        preferredName: guest.preferredName,
        age: typeof guest.age === 'string' ? parseInt(guest.age) : guest.age,
        gender:
          guest.gender === 'M'
            ? 'male'
            : guest.gender === 'F'
              ? 'female'
              : 'non-binary',
        groupName: guest.groupName,
        lowerBunk: guest.lowerBunk,
        arrival,
        departure,
        notes: guest.notes,
      },
    })
  })

  return blobs
})

// Cache dragged guest blob data to avoid repeated lookups
const draggedGuestBlob = computed(() => {
  const draggedGuestId = getDraggedGuestId()
  if (!draggedGuestId) return null

  // Check unassigned blobs first
  const unassignedBlob = unassignedGuestBlobs.value.find(b => b.guestId === draggedGuestId)
  if (unassignedBlob) return unassignedBlob

  // Find the dragged guest's blob in assigned beds
  for (const bedRow of bedRows.value) {
    const blobs = getGuestBlobsForBed(bedRow.bed.id)
    const blob = blobs.find(b => b.guestId === draggedGuestId)
    if (blob) return blob
  }
  return null
})

// Get the blob for a picked guest (similar to draggedGuestBlob)
const pickedGuestBlob = computed(() => {
  const pickedGuestId = getPickedGuestId()
  if (!pickedGuestId) return null

  // Check unassigned blobs first
  const unassignedBlob = unassignedGuestBlobs.value.find(b => b.guestId === pickedGuestId)
  if (unassignedBlob) return unassignedBlob

  // Find the picked guest's blob in assigned beds
  for (const bedRow of bedRows.value) {
    const blobs = getGuestBlobsForBed(bedRow.bed.id)
    const blob = blobs.find(b => b.guestId === pickedGuestId)
    if (blob) return blob
  }
  return null
})

// Pre-compute valid drop cells as a Set for O(1) lookup
const validDropCells = computed(() => {
  const cells = new Set<string>()

  // Check both dragging and picked states
  const isDraggingOrPicked = dragState.value.isDragging || pickState.value.isPicked
  if (!isDraggingOrPicked) return cells

  // Use the appropriate blob (dragged or picked)
  const blob = dragState.value.isDragging ? draggedGuestBlob.value : pickedGuestBlob.value
  if (!blob) return cells

  // Add unassigned cells as valid drop targets (to unassign a guest)
  if (isValidDropTarget('unassigned')) {
    for (let colIndex = blob.startColIndex; colIndex <= blob.endColIndex; colIndex++) {
      cells.add(`unassigned-${colIndex}`)
    }
  }

  // For each valid bed, add all cells in the date range
  for (const bedRow of bedRows.value) {
    if (isValidDropTarget(bedRow.bed.id)) {
      for (let colIndex = blob.startColIndex; colIndex <= blob.endColIndex; colIndex++) {
        cells.add(`${bedRow.bed.id}-${colIndex}`)
      }
    }
  }

  return cells
})

// Guest edit modal state
const showGuestModal = ref(false)
const selectedGuestId = ref<string | null>(null)
const selectedGuest = computed(() => {
  if (!selectedGuestId.value) return undefined
  return guestStore.getGuestById(selectedGuestId.value)
})

/**
 * Get guest blobs that should be rendered in a specific cell
 * Only returns blobs where startColIndex matches the cell's column index
 * Adds stacking information for overlapping blobs
 */
function getGuestBlobsForCell(bedId: string, colIndex: number): Array<GuestBlobData & { stackPosition?: number; stackCount?: number }> {
  const allBlobs = getGuestBlobsForBed(bedId)
  const cellBlobs = allBlobs.filter(blob => blob.startColIndex === colIndex)

  // For each blob starting in this cell, check if there are other blobs on this bed that overlap
  return cellBlobs.map((blob, index) => {
    // Find all blobs that overlap with this blob's date range
    const overlappingBlobs = allBlobs.filter(otherBlob => {
      // Check if date ranges overlap
      return !(blob.endColIndex < otherBlob.startColIndex || blob.startColIndex > otherBlob.endColIndex)
    })

    if (overlappingBlobs.length > 1) {
      // Multiple blobs overlap - need to stack them
      const sortedOverlapping = overlappingBlobs.sort((a, b) => a.startColIndex - b.startColIndex)
      const stackPosition = sortedOverlapping.findIndex(b => b.guestId === blob.guestId)

      return {
        ...blob,
        stackPosition,
        stackCount: overlappingBlobs.length
      }
    }

    return blob
  })
}

/**
 * Check if a bed is currently a valid drop target (for drag or pick hover)
 */
function isDropTarget(bedId: string): boolean {
  return checkIsDropTarget(bedId) || isPickHoverTarget(bedId)
}

/**
 * Get ghost preview data for drop target cells
 * Returns the blob data if this cell should show a ghost preview
 * Works for both drag-and-drop and click-to-pick modes
 */
function getGhostPreview(bedId: string, colIndex: number): GuestBlobData | null {
  // Check if this bed is a drop target (drag) or pick hover target
  const isDragTarget = checkIsDropTarget(bedId)
  const isPickTarget = isPickHoverTarget(bedId)

  if (!isDragTarget && !isPickTarget) return null

  // Use the appropriate blob (dragged or picked)
  const blob = isDragTarget ? draggedGuestBlob.value : pickedGuestBlob.value
  if (!blob) return null

  // Check if this cell is the start column for the ghost preview
  if (blob.startColIndex === colIndex) {
    return blob
  }

  return null
}

/**
 * Get style for ghost preview based on blob data
 */
function getGhostPreviewStyle(blob: GuestBlobData) {
  const spanCount = blob.spanCount
  const width = `calc(${spanCount * 100}% + ${(spanCount - 1) * 1}px)`

  return {
    width,
    left: '0',
  }
}

/**
 * Get full name for ghost preview
 */
function getGhostFullName(blob: GuestBlobData): string {
  const guest = blob.guest
  const firstName = guest.preferredName || guest.firstName
  return `${firstName} ${guest.lastName}`
}

/**
 * Get warnings that would occur if the currently dragged/picked guest were placed on this bed
 * Returns array of warning messages, empty if placement is valid
 */
function getPlacementWarnings(bedId: string): string[] {
  // Get the currently dragged or picked guest
  const guestId = dragState.value.isDragging
    ? dragState.value.draggedGuestId
    : pickState.value.isPicked
      ? pickState.value.pickedGuestId
      : null

  if (!guestId) return []

  // "unassigned" area never has warnings
  if (bedId === 'unassigned') return []

  const guest = guestStore.getGuestById(guestId)
  if (!guest) return []

  const bed = dormitoryStore.getBedById(bedId)
  if (!bed) return []

  const room = dormitoryStore.getRoomByBedId(bedId)
  if (!room) return []

  const warnings: string[] = []

  // Check gender compatibility (non-binary guests can go anywhere)
  if (
    guest.gender !== 'Non-binary/Other' &&
    room.roomGender !== 'Coed' &&
    guest.gender !== room.roomGender
  ) {
    warnings.push(`${guest.gender} guest in ${room.roomGender} room`)
  }

  // Check bunk type compatibility
  if (guest.lowerBunk && bed.bedType === 'upper') {
    warnings.push('Needs lower bunk')
  }

  return warnings
}

/**
 * Check if placing the currently dragged/picked guest on this bed would cause warnings
 */
function wouldHaveWarnings(bedId: string): boolean {
  return getPlacementWarnings(bedId).length > 0
}

/**
 * Check if a bed has a conflict on a specific date
 */
function hasConflict(bedId: string, date: Date): boolean {
  return timelineStore.hasConflictOnDate(bedId, date)
}

/**
 * Check if a bed has any conflicts across all dates in the range
 */
function bedHasAnyConflict(bedId: string): boolean {
  return dateColumns.value.some(dateCol => hasConflict(bedId, dateCol.date))
}

/**
 * Check if a bed is a valid drop target for the currently dragged or picked guest
 * A bed is valid if it won't create gender mismatch or bunk type warnings
 * Special case: "unassigned" is always a valid drop target (to unassign a guest)
 */
function isValidDropTarget(bedId: string): boolean {
  // Check both dragging and picked states
  const guestId = dragState.value.isDragging
    ? dragState.value.draggedGuestId
    : pickState.value.isPicked
      ? pickState.value.pickedGuestId
      : null

  if (!guestId) {
    return false
  }

  // "unassigned" is always a valid drop target (to unassign a guest)
  if (bedId === 'unassigned') {
    return true
  }

  const guest = guestStore.getGuestById(guestId)
  if (!guest) return false

  const bed = dormitoryStore.getBedById(bedId)
  if (!bed) return false

  const room = dormitoryStore.getRoomByBedId(bedId)
  if (!room) return false

  // Check gender compatibility (non-binary guests can go anywhere)
  if (
    guest.gender !== 'Non-binary/Other' &&
    room.roomGender !== 'Coed' &&
    guest.gender !== room.roomGender
  ) {
    return false
  }

  // Check bunk type compatibility
  if (guest.lowerBunk && bed.bedType === 'upper') {
    return false
  }

  return true
}

/**
 * Check if a specific cell should be highlighted as a valid drop target
 * Uses pre-computed Set for O(1) lookup
 */
function isValidDropCell(bedId: string, colIndex: number): boolean {
  return validDropCells.value.has(`${bedId}-${colIndex}`)
}

/**
 * Handle drag over event
 */
function onDragOver(bedId: string) {
  enterDropTarget(bedId)
}

/**
 * Handle drag leave event
 */
function onDragLeave() {
  leaveDropTarget()
}

/**
 * Handle drop event
 */
function onDrop(bedId: string) {
  dropOnBed(bedId)
}

/**
 * Handle guest drag start
 */
function onGuestDragStart(guestId: string, bedId: string) {
  startDrag(guestId, bedId)
}

/**
 * Handle guest drag end
 */
function onGuestDragEnd() {
  endDrag()
}

/**
 * Handle guest pick (click-to-pick mode)
 */
function onGuestPick(guestId: string, bedId: string) {
  pickGuest(guestId, bedId)
}

/**
 * Handle click on a bed cell to place a picked guest
 */
function onBedCellClick(bedId: string) {
  if (hasPickedGuest()) {
    placeGuest(bedId)
  }
}

/**
 * Handle mouse enter on a cell (for pick mode ghost preview)
 */
function onCellMouseEnter(bedId: string) {
  if (hasPickedGuest()) {
    enterPickTarget(bedId)
  }
}

/**
 * Handle mouse leave on a cell (for pick mode ghost preview)
 */
function onCellMouseLeave() {
  leavePickTarget()
}

/**
 * Check if a guest blob is currently picked
 */
function checkIsGuestPicked(guestId: string): boolean {
  return isGuestPicked(guestId)
}

/**
 * Handle guest edit click
 */
function onEditGuest(guestId: string) {
  selectedGuestId.value = guestId
  showGuestModal.value = true
}

/**
 * Close guest modal
 */
function closeGuestModal() {
  showGuestModal.value = false
  selectedGuestId.value = null
}

/**
 * Check if room has available beds
 */
function roomHasAvailableBeds(dormitoryName: string, roomName: string): boolean {
  const dorm = dormitoryStore.dormitories.find(d => d.dormitoryName === dormitoryName)
  if (!dorm) return false

  const room = dorm.rooms.find(r => r.roomName === roomName)
  if (!room || !room.beds) return false

  return room.beds.some(bed => !bed.assignedGuestId && bed.active !== false)
}

/**
 * Auto-place guests in a specific room
 */
function handleAutoPlaceRoom(dormitoryName: string, roomName: string) {
  const dorm = dormitoryStore.dormitories.find(d => d.dormitoryName === dormitoryName)
  if (!dorm) return

  const room = dorm.rooms.find(r => r.roomName === roomName)
  if (!room) return

  const suggestions = autoPlaceGuestsInRoom(room)

  // Add suggestions to the assignment store
  suggestions.forEach((bedId, guestId) => {
    assignmentStore.suggestedAssignments.set(guestId, bedId)
  })
}

/**
 * Get suggestion count for a specific room
 */
function getRoomSuggestionCount(dormitoryName: string, roomName: string): number {
  const dorm = dormitoryStore.dormitories.find(d => d.dormitoryName === dormitoryName)
  if (!dorm) return 0

  const room = dorm.rooms.find(r => r.roomName === roomName)
  if (!room || !room.beds) return 0

  const roomBedIds = room.beds.map(bed => bed.bedId)
  return assignmentStore.getSuggestionsCountForRoom(roomBedIds)
}

/**
 * Accept all suggestions for a specific room
 */
function handleAcceptRoomSuggestions(dormitoryName: string, roomName: string) {
  const dorm = dormitoryStore.dormitories.find(d => d.dormitoryName === dormitoryName)
  if (!dorm) return

  const room = dorm.rooms.find(r => r.roomName === roomName)
  if (!room || !room.beds) return

  const roomBedIds = room.beds.map(bed => bed.bedId)
  assignmentStore.acceptSuggestionsForRoom(roomBedIds)
}

/**
 * Handle guest update from modal
 */
function handleGuestUpdate(guestData: Partial<Guest>) {
  if (guestData.id) {
    guestStore.updateGuest(guestData.id, guestData)
  }
  closeGuestModal()
}

/**
 * Get room style with lightened background color
 */
function getRoomStyle(bedRow: any) {
  const dormColor = bedRow.dormitory.color || '#f9fafb'
  // Lighten the dorm color by 50%
  const lightenedColor = lightenColor(dormColor, 0.5)
  return {
    backgroundColor: lightenedColor,
  }
}

/**
 * Lighten a hex color by a percentage (0-1)
 */
function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Lighten by mixing with white
  const newR = Math.round(r + (255 - r) * percent)
  const newG = Math.round(g + (255 - g) * percent)
  const newB = Math.round(b + (255 - b) * percent)

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Get gender code for room badge
 */
function getRoomGenderCode(gender: 'male' | 'female' | 'any'): string {
  if (gender === 'male') return 'M'
  if (gender === 'female') return 'F'
  return 'A' // Any gender
}

/**
 * Check if dormitory label should be shown for this row
 * Only show on the first bed of each dormitory
 */
function shouldShowDormLabel(index: number): boolean {
  if (index === 0) return true
  const currentDorm = bedRows.value[index].dormitory.id
  const prevDorm = bedRows.value[index - 1].dormitory.id
  return currentDorm !== prevDorm
}

/**
 * Get rowspan for dormitory label
 * Count how many consecutive beds belong to this dormitory
 */
function getDormRowspan(index: number): number {
  const currentDorm = bedRows.value[index].dormitory.id
  let count = 1
  for (let i = index + 1; i < bedRows.value.length; i++) {
    if (bedRows.value[i].dormitory.id === currentDorm) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Determine if a row should have dark room stripe
 * Alternates between dark and light for each room
 */
function isRoomStripeDark(index: number): boolean {
  // Count how many unique rooms appear before this row
  const currentRoomId = bedRows.value[index].room.id
  const uniqueRoomsBeforeCurrent = new Set<string>()

  for (let i = 0; i < index; i++) {
    uniqueRoomsBeforeCurrent.add(bedRows.value[i].room.id)
  }

  // Add current room if it's the first time seeing it
  if (!uniqueRoomsBeforeCurrent.has(currentRoomId)) {
    return uniqueRoomsBeforeCurrent.size % 2 === 0
  }

  // Check if the first occurrence of current room was dark
  for (let i = 0; i < index; i++) {
    if (bedRows.value[i].room.id === currentRoomId) {
      return isRoomStripeDark(i)
    }
  }

  return false
}

/**
 * Check if room label should be shown for this row
 * Only show on the first bed of each room
 */
function shouldShowRoomLabel(index: number): boolean {
  if (index === 0) return true
  const currentRoom = bedRows.value[index].room.id
  const prevRoom = bedRows.value[index - 1].room.id
  return currentRoom !== prevRoom
}

/**
 * Get rowspan for room label
 * Count how many consecutive beds belong to this room
 */
function getRoomRowspan(index: number): number {
  const currentRoom = bedRows.value[index].room.id
  let count = 1
  for (let i = index + 1; i < bedRows.value.length; i++) {
    if (bedRows.value[i].room.id === currentRoom) {
      count++
    } else {
      break
    }
  }
  return count
}
</script>

<style scoped lang="scss">
.timeline-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  overflow: hidden;
}

.timeline-content-wrapper {
  flex: 1;
  margin: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.timeline-header-section {
  position: sticky;
  top: 0;
  z-index: 20;
  background: white;
  border-bottom: 2px solid #e5e7eb;
}

.unassigned-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  margin: 0;
  padding: 0;
  background: white;
  position: relative;
}

.unassigned-label-fixed {
  width: 240px;
  min-width: 240px;
  background-color: #bfdbfe;
  color: #1e40af;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 2px solid #3b82f6;
  position: sticky;
  left: 0;
  z-index: 15;
}

.unassigned-scrollable {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  background: white;
}

.timeline-table.unassigned-table {
  min-width: auto;
}

.section-divider {
  height: 8px;
  background: linear-gradient(to bottom, #e5e7eb, #3b82f6, #e5e7eb);
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;

  &:hover {
    background: linear-gradient(to bottom, #d1d5db, #2563eb, #d1d5db);
  }

  .divider-handle {
    width: 40px;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}

.dorms-section {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  min-height: 0; // Important for flex child scrolling
  margin: 0;
  padding: 0;
  background: white;
}

.timeline-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
  table-layout: fixed;
  margin: 0;
  display: table;

  thead {
    background-color: #f3f4f6;

    th {
      padding: 12px 16px;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;

      &.dorm-header {
        padding: 8px 4px;
        width: 40px;
        max-width: 40px;
        min-width: 40px;
        background-color: #e5e7eb;
        position: sticky;
        left: 0;
        z-index: 11;
        vertical-align: middle;
      }

      &.room-header {
        padding: 8px 4px;
        width: 100px;
        max-width: 100px;
        min-width: 100px;
        background-color: #e5e7eb;
        position: sticky;
        left: 40px;
        z-index: 11;
        vertical-align: middle;
      }

      &.bed-header {
        text-align: left;
        background-color: #e5e7eb;
        position: sticky;
        left: 140px;
        z-index: 11;
        width: 100px;
        max-width: 100px;
        min-width: 100px;
      }

      &.month-header {
        background-color: #e5e7eb;
        text-align: center;
        padding: 8px 4px;
        font-weight: 600;
        border-bottom: 1px solid #d1d5db;
        border-right: 2px solid #9ca3af;

        &:last-child {
          border-right: 1px solid #e5e7eb;
        }
      }

      &.date-header {
        width: var(--column-width, 50px);
        min-width: var(--column-width, 50px);
        max-width: var(--column-width, 50px);
        background-color: #f3f4f6;
        text-align: center;
        padding: 4px 4px;

        .date-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;

          .weekday {
            font-size: 0.65rem;
            font-weight: 500;
            color: #6b7280;
            line-height: 1;
          }

          .day {
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            line-height: 1;
          }
        }

        &.is-sunday {
          .weekday {
            color: #dc2626;
          }

          .day {
            color: #dc2626;
          }
        }
      }

      &:last-child {
        border-right: none;
      }
    }
  }

  tbody {
    margin: 0;
    padding: 0;

    // Unassigned section styling - scrollable window
    tr.unassigned-row {
      height: 100%;
      margin: 0;
      padding: 0;

      .unassigned-date-cell {
        padding: 0;
        background-color: #f0f9ff;
        position: relative;
        height: 100%;
        min-height: 150px;
        vertical-align: top;
        overflow: visible; // Allow blobs to span across cells

        .unassigned-blob-wrapper {
          :deep(.guest-blob) {
            // Override component positioning - blob should fill wrapper
            position: static !important;
            width: 100% !important;
            height: 100% !important;
            left: auto !important;
            top: auto !important;
            bottom: auto !important;

            padding: 2px 8px;
            font-size: 0.7rem;

            .guest-info {
              gap: 4px;
            }

            .guest-name {
              font-size: 0.65rem;
            }

            .gender-badge {
              width: 16px;
              height: 16px;
              font-size: 0.6rem;
            }

            .guest-age {
              font-size: 0.65rem;
            }
          }
        }
      }
    }

    tr {
      margin: 0;
      padding: 0;

      &:hover {
        background-color: #f9fafb;
      }

      &:nth-child(2n) {
        background-color: #fafafa;
      }

      &.collapsed {
        height: 5px;

        td {
          padding: 0;
          font-size: 0;
          line-height: 0;
        }
      }

      &.has-conflict {
        background-color: #fed7aa !important;

        td {
          background-color: #fed7aa !important;
        }

        &:hover {
          background-color: #fdba74 !important;

          td {
            background-color: #fdba74 !important;
          }
        }
      }
    }

    td {
      padding: 2px 8px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
      text-align: center;
      vertical-align: middle;
      height: 30px;
      max-height: 30px;

      &.dorm-label {
        padding: 2px 6px;
        width: 40px;
        max-width: 40px;
        min-width: 40px;
        font-weight: 600;
        font-size: 0.7rem;
        color: #1f2937;
        background-color: #f9fafb;
        position: sticky;
        left: 0;
        z-index: 9;
        border-right: 1px solid #d1d5db;
        height: 30px;
        max-height: 30px;
        overflow: hidden;
        text-align: center;
        // Ensure text is readable on colored backgrounds
        text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
      }

      &.room-label {
        padding: 2px 6px;
        width: 100px;
        max-width: 100px;
        min-width: 100px;
        font-weight: 600;
        font-size: 0.7rem;
        color: #1f2937;
        background-color: #f9fafb;
        position: sticky;
        left: 40px;
        z-index: 9;
        border-right: 1px solid #d1d5db;
        height: 30px;
        max-height: 30px;
        overflow: hidden;
        line-height: 1.2;
        text-align: center;
        // Ensure text is readable on colored backgrounds
        text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);

        .room-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          height: 100%;
          justify-content: center;
        }

        .room-gender-badge {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 600;
          color: #1f2937;

          &.gender-male {
            background-color: #93c5fd;
          }

          &.gender-female {
            background-color: #f9a8d4;
          }

          &.gender-any {
            background-color: #d1d5db;
          }
        }

        .room-auto-place-btn {
          padding: 2px 6px;
          font-size: 0.6rem;
          font-weight: 500;
          color: white;
          background-color: #3b82f6;
          border: 1px solid #3b82f6;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          margin-top: 4px;

          &:hover {
            background-color: #2563eb;
            transform: scale(1.05);
          }

          &:active {
            transform: scale(0.95);
          }
        }

        .room-accept-btn {
          padding: 2px 6px;
          font-size: 0.6rem;
          font-weight: 500;
          color: white;
          background-color: #10b981;
          border: 1px solid #10b981;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          margin-top: 4px;

          &:hover {
            background-color: #059669;
            transform: scale(1.05);
          }

          &:active {
            transform: scale(0.95);
          }
        }
      }

      &.bed-label {
        font-weight: 600;
        font-size: 0.75rem;
        color: #1f2937;
        background-color: #f9fafb;
        position: sticky;
        left: 140px;
        z-index: 9;
        text-align: left;
        border-right: 2px solid #d1d5db;
        width: 100px;
        max-width: 100px;
        min-width: 100px;
        overflow: hidden;

        &.has-conflict {
          background-color: #fca5a5;
          color: #7f1d1d;
          border-left: 4px solid #dc2626;
          font-weight: 700;
        }
      }

      &.guest-cell {
        width: var(--column-width, 50px);
        min-width: var(--column-width, 50px);
        max-width: var(--column-width, 50px);
        background-color: white;
        position: relative;
        overflow: visible; // Important: allow guest blobs to span across cells

        // Removed yellow highlight on hover
        // &.drop-target {
        //   background-color: #fef3c7 !important;
        // }

        &.valid-drop-cell {
          background-color: #d1fae5 !important;
          cursor: pointer;
        }

        &.conflict {
          background-color: rgba(220, 38, 38, 0.4) !important;
          position: relative;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 3px solid rgba(153, 27, 27, 0.3);
            box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.3);
            z-index: 10;
            pointer-events: none;
          }

          &::after {
            content: '⚠️';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.2rem;
            z-index: 100;
            pointer-events: none;
          }
        }
      }
    }

    // Room stripe alternating colors
    tr.room-stripe-dark {
      td.guest-cell {
        background-color: #f3f4f6;
      }

      td.bed-label {
        background-color: #f3f4f6;
      }
    }

    tr.room-stripe-light {
      td.guest-cell {
        background-color: white;
      }

      td.bed-label {
        background-color: white;
      }
    }

    // Keep drop target and conflict styling
    tr {
      // Removed yellow highlight on hover
      // td.guest-cell.drop-target {
      //   background-color: #fef3c7 !important;
      // }

      td.guest-cell.conflict {
        background-color: rgba(220, 38, 38, 0.4) !important;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 3px solid rgba(153, 27, 27, 0.3);
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.3);
          z-index: 10;
          pointer-events: none;
        }

        &::after {
          content: '⚠️';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.2rem;
          z-index: 100;
          pointer-events: none;
        }
      }

      &:last-child {
        border-right: none;
      }
    }
  }
}

.ghost-preview {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: rgba(156, 163, 175, 0.3);
  border: 2px dashed #6b7280;
  border-radius: 4px;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;

  .ghost-text {
    font-size: 0.7rem;
    font-weight: 500;
    color: #4b5563;
    opacity: 0.8;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .warning-emoji {
    font-size: 0.9rem;
  }

  &.has-warning {
    background: rgba(239, 68, 68, 0.15);
    border: 2px dashed #ef4444;

    .ghost-text {
      color: #991b1b;
    }
  }
}

.rotated-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  white-space: normal; // Allow wrapping
  word-wrap: break-word;
  display: inline-block;
  max-width: 26px; // Limit horizontal width (which becomes vertical when rotated)
  line-height: 1.2;
  overflow: hidden;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;

  p {
    margin: 0;
  }
}
</style>
