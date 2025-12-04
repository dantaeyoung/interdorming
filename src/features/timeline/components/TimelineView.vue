<template>
  <div class="timeline-view">
    <TimelineHeader />

    <div class="timeline-container" :style="{ '--column-width': `${columnWidthPx}px` }">
      <table class="timeline-table">
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
              :title="dateCol.fullLabel"
            >
              {{ dateCol.date.getDate() }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(bedRow, index) in bedRows"
            :key="bedRow.bed.id"
            class="bed-row"
            :class="{ collapsed: bedRow.isCollapsed }"
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
              </div>
            </td>

            <!-- Bed label -->
            <td class="bed-label">
              {{ bedRow.bed.bedNumber }} ({{ bedRow.bed.bedType }})
            </td>

            <!-- Date cells -->
            <td
              v-for="dateCol in dateColumns"
              :key="`${bedRow.bed.id}-${dateCol.index}`"
              class="guest-cell"
              :class="{
                'drop-target': isDropTarget(bedRow.bed.id),
                conflict: hasConflict(bedRow.bed.id, dateCol.date),
              }"
              @dragover.prevent="onDragOver(bedRow.bed.id)"
              @dragleave="onDragLeave"
              @drop="onDrop(bedRow.bed.id)"
            >
              <!-- Render guest blob if this is the starting column -->
              <GuestBlob
                v-for="blob in getGuestBlobsForCell(bedRow.bed.id, dateCol.index)"
                :key="blob.guestId"
                :guest-blob="blob"
                @drag-start="onGuestDragStart"
                @drag-end="onGuestDragEnd"
                @edit-guest="onEditGuest"
              />
            </td>
          </tr>
        </tbody>
      </table>
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
import { computed, ref } from 'vue'
import { useTimelineData } from '../composables/useTimelineData'
import { useTimelineDragDrop } from '../composables/useTimelineDragDrop'
import { useTimelineStore } from '@/stores/timelineStore'
import { useGuestStore } from '@/stores/guestStore'
import TimelineHeader from './TimelineHeader.vue'
import GuestBlob from './GuestBlob.vue'
import { GuestFormModal } from '@/features/guests/components'
import type { GuestBlobData } from '../types/timeline'
import type { Guest } from '@/types'

const timelineStore = useTimelineStore()
const guestStore = useGuestStore()
const { dateColumns, monthGroups, bedRows, getGuestBlobsForBed } = useTimelineData()
const {
  startDrag,
  endDrag,
  enterDropTarget,
  leaveDropTarget,
  dropOnBed,
  isDropTarget: checkIsDropTarget,
} = useTimelineDragDrop()

// Column width in pixels (directly from slider, 10-100px)
const columnWidthPx = computed(() => timelineStore.columnWidth)

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
 */
function getGuestBlobsForCell(bedId: string, colIndex: number): GuestBlobData[] {
  const allBlobs = getGuestBlobsForBed(bedId)
  return allBlobs.filter(blob => blob.startColIndex === colIndex)
}

/**
 * Check if a bed is currently a valid drop target
 */
function isDropTarget(bedId: string): boolean {
  return checkIsDropTarget(bedId)
}

/**
 * Check if a bed has a conflict on a specific date
 */
function hasConflict(bedId: string, date: Date): boolean {
  return timelineStore.hasConflictOnDate(bedId, date)
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

.timeline-container {
  flex: 1;
  margin: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
  position: relative;
}

.timeline-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;

  thead {
    background-color: #f3f4f6;
    position: sticky;
    top: 0;
    z-index: 10;

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
        max-width: var(--column-width, 50px);
        background-color: #f3f4f6;
        text-align: center;
        padding: 8px 4px;
      }

      &:last-child {
        border-right: none;
      }
    }
  }

  tbody {
    tr {
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
      }

      &.guest-cell {
        width: var(--column-width, 50px);
        max-width: var(--column-width, 50px);
        background-color: white;
        position: relative;
        overflow: visible; // Important: allow guest blobs to span across cells

        &.drop-target {
          background-color: #fef3c7;
        }

        &.conflict {
          background-color: #fee2e2;
        }
      }

      &:last-child {
        border-right: none;
      }
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
