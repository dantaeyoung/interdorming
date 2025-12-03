<template>
  <div class="print-view">
    <div class="print-header no-print">
      <h2>Room Assignment Report</h2>
      <button @click="handlePrint" class="print-button">🖨️ Print</button>
    </div>

    <!-- Column Selection -->
    <div class="column-selector no-print">
      <h3>Select Columns to Print</h3>
      <div class="checkbox-grid">
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.bedInfo" />
          <span>Bed Info</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.guestName" />
          <span>Guest Name</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.gender" />
          <span>Gender</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.age" />
          <span>Age</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.group" />
          <span>Group</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.lowerBunk" />
          <span>Lower Bunk</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.arrival" />
          <span>Arrival Date</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.departure" />
          <span>Departure Date</span>
        </label>
      </div>
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
                <th v-if="columns.bedInfo">Bed</th>
                <th v-if="columns.guestName">Guest Name</th>
                <th v-if="columns.gender">Gender</th>
                <th v-if="columns.age">Age</th>
                <th v-if="columns.group">Group</th>
                <th v-if="columns.lowerBunk">Lower Bunk?</th>
                <th v-if="columns.arrival">Arrival</th>
                <th v-if="columns.departure">Departure</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bed in room.beds.filter(b => b.active !== false)" :key="bed.bedId">
                <td v-if="columns.bedInfo" class="bed-info">
                  {{ bed.position }} {{ bed.bedType }}
                </td>
                <td v-if="columns.guestName" class="guest-name">{{ getGuestName(bed.assignedGuestId) }}</td>
                <td v-if="columns.gender">{{ getGuestField(bed.assignedGuestId, 'gender') }}</td>
                <td v-if="columns.age">{{ getGuestField(bed.assignedGuestId, 'age') }}</td>
                <td v-if="columns.group">{{ getGuestField(bed.assignedGuestId, 'groupName') }}</td>
                <td v-if="columns.lowerBunk">{{ getGuestField(bed.assignedGuestId, 'lowerBunk') }}</td>
                <td v-if="columns.arrival">{{ getGuestField(bed.assignedGuestId, 'arrival') }}</td>
                <td v-if="columns.departure">{{ getGuestField(bed.assignedGuestId, 'departure') }}</td>
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
              <th v-if="columns.guestName">Name</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.lowerBunk">Lower Bunk?</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guestId in assignmentStore.unassignedGuestIds" :key="guestId">
              <td v-if="columns.guestName" class="guest-name">{{ getGuestNameById(guestId) }}</td>
              <td v-if="columns.gender">{{ getGuestFieldById(guestId, 'gender') }}</td>
              <td v-if="columns.age">{{ getGuestFieldById(guestId, 'age') }}</td>
              <td v-if="columns.group">{{ getGuestFieldById(guestId, 'groupName') }}</td>
              <td v-if="columns.lowerBunk">{{ getGuestFieldById(guestId, 'lowerBunk') }}</td>
              <td v-if="columns.arrival">{{ getGuestFieldById(guestId, 'arrival') }}</td>
              <td v-if="columns.departure">{{ getGuestFieldById(guestId, 'departure') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'
import { useUtils } from '@/shared/composables/useUtils'
import type { Room } from '@/types'

const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()
const { createDisplayName } = useUtils()

// Column visibility state
const columns = reactive({
  bedInfo: true,
  guestName: true,
  gender: true,
  age: true,
  group: true,
  lowerBunk: true,
  arrival: true,
  departure: true,
})

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

.column-selector {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 16px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  span {
    user-select: none;
  }

  &:hover {
    color: #1f2937;
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
