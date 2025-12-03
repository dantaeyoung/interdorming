<template>
  <div class="print-view">
    <div class="print-header no-print">
      <h2>Room Assignment Report</h2>
      <button @click="handlePrint" class="print-button">🖨️ Print</button>
    </div>

    <div class="print-content">
      <!-- Header for printed page -->
      <div class="report-header">
        <h1>Blue Cliff Monastery</h1>
        <h2>Room Assignment Report</h2>
        <p class="report-date">{{ currentDate }}</p>
      </div>

      <!-- Summary Statistics -->
      <div class="summary-section">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Guests:</span>
            <span class="summary-value">{{ guestStore.guests.length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Assigned:</span>
            <span class="summary-value">{{ assignmentStore.assignedCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Unassigned:</span>
            <span class="summary-value">{{ assignmentStore.unassignedCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Beds:</span>
            <span class="summary-value">{{ totalBeds }}</span>
          </div>
        </div>
      </div>

      <!-- Room Assignments by Dormitory -->
      <div
        v-for="(dormitory, dormIndex) in dormitoryStore.dormitories"
        :key="dormIndex"
        class="dormitory-section"
      >
        <h3 class="dormitory-name">{{ dormitory.dormitoryName }}</h3>

        <div
          v-for="(room, roomIndex) in dormitory.rooms.filter(r => r.active)"
          :key="roomIndex"
          class="room-section"
        >
          <div class="room-header">
            <h4>{{ room.roomName }}</h4>
            <span class="room-gender">{{ room.roomGender }}</span>
            <span class="room-capacity"
              >{{ getOccupiedCount(room) }}/{{ room.beds.length }} beds</span
            >
          </div>

          <table class="room-table">
            <thead>
              <tr>
                <th>Bed</th>
                <th>Guest Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Group</th>
                <th>Lower Bunk?</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bed in room.beds.filter(b => b.active !== false)" :key="bed.bedId">
                <td class="bed-info">
                  {{ bed.position }} {{ bed.bedType }}
                </td>
                <td class="guest-name">{{ getGuestName(bed.assignedGuestId) }}</td>
                <td>{{ getGuestField(bed.assignedGuestId, 'gender') }}</td>
                <td>{{ getGuestField(bed.assignedGuestId, 'age') }}</td>
                <td>{{ getGuestField(bed.assignedGuestId, 'groupName') }}</td>
                <td>{{ getGuestField(bed.assignedGuestId, 'lowerBunk') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Unassigned Guests -->
      <div v-if="assignmentStore.unassignedCount > 0" class="unassigned-section">
        <h3>Unassigned Guests</h3>
        <table class="unassigned-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Group</th>
              <th>Lower Bunk?</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guestId in assignmentStore.unassignedGuestIds" :key="guestId">
              <td class="guest-name">{{ getGuestNameById(guestId) }}</td>
              <td>{{ getGuestFieldById(guestId, 'gender') }}</td>
              <td>{{ getGuestFieldById(guestId, 'age') }}</td>
              <td>{{ getGuestFieldById(guestId, 'groupName') }}</td>
              <td>{{ getGuestFieldById(guestId, 'lowerBunk') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'
import { useUtils } from '@/shared/composables/useUtils'
import type { Room } from '@/types'

const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()
const { createDisplayName } = useUtils()

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const totalBeds = computed(() => {
  return dormitoryStore.getAllBeds.length
})

function getOccupiedCount(room: Room): number {
  return room.beds.filter(bed => bed.assignedGuestId).length
}

function getGuestName(guestId: string | null): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  return guest ? createDisplayName(guest) : '—'
}

function getGuestNameById(guestId: string): string {
  const guest = guestStore.getGuestById(guestId)
  return guest ? createDisplayName(guest) : '—'
}

function getGuestField(guestId: string | null, field: string): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  if (!guest) return '—'

  const value = guest[field as keyof typeof guest]
  if (value === null || value === undefined || value === '') return '—'

  // Format boolean lowerBunk values
  if (field === 'lowerBunk') {
    if (value === true || value === 'Yes' || value === 'TRUE' || value === 'true') return 'Yes'
    if (value === false || value === 'No' || value === 'FALSE' || value === 'false') return 'No'
  }

  return String(value)
}

function getGuestFieldById(guestId: string, field: string): string {
  return getGuestField(guestId, field)
}

function handlePrint() {
  window.print()
}
</script>

<style scoped lang="scss">
.print-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }
}

.print-button {
  padding: 12px 24px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2563eb;
  }
}

.print-content {
  background: white;
}

.report-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    margin: 0 0 8px 0;
    font-size: 2rem;
    color: #1f2937;
  }

  h2 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    color: #4b5563;
    font-weight: 500;
  }

  .report-date {
    margin: 0;
    color: #6b7280;
    font-size: 0.95rem;
  }
}

.summary-section {
  margin-bottom: 32px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .summary-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.dormitory-section {
  margin-bottom: 32px;
  page-break-inside: avoid;

  .dormitory-name {
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #1f2937;
    font-size: 1.5rem;
    color: #1f2937;
  }
}

.room-section {
  margin-bottom: 24px;
  page-break-inside: avoid;

  .room-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    h4 {
      margin: 0;
      font-size: 1.125rem;
      color: #1f2937;
    }

    .room-gender {
      padding: 2px 8px;
      background: #e5e7eb;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .room-capacity {
      margin-left: auto;
      color: #6b7280;
      font-size: 0.875rem;
    }
  }
}

.room-table,
.unassigned-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;

  th {
    text-align: left;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
  }

  td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #1f2937;

    &.bed-info {
      font-weight: 500;
      white-space: nowrap;
    }

    &.guest-name {
      font-weight: 500;
    }
  }

  tbody tr:nth-child(even) {
    background: #f9fafb;
  }
}

.unassigned-section {
  margin-top: 32px;
  page-break-before: always;

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
    padding-bottom: 8px;
    border-bottom: 2px solid #ef4444;
  }
}

/* Print styles */
@media print {
  .print-view {
    padding: 0;
    max-width: none;
  }

  .no-print {
    display: none !important;
  }

  .print-content {
    background: white;
  }

  .summary-section {
    background: white;
    border: 1px solid #d1d5db;
  }

  .room-section {
    page-break-inside: avoid;
  }

  .dormitory-section {
    page-break-after: always;

    &:last-child {
      page-break-after: auto;
    }
  }

  table {
    page-break-inside: avoid;
  }

  /* Ensure proper printing on letter paper */
  @page {
    size: letter;
    margin: 0.75in;
  }
}
</style>
