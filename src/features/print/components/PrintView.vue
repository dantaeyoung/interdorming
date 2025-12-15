<template>
  <div class="print-view">
    <div class="print-header no-print">
      <h2>Room Assignment Report</h2>
      <button @click="handlePrint" class="print-button">🖨️ Print</button>
    </div>

    <!-- Display Options -->
    <div class="display-options no-print">
      <h3>Display Options</h3>
      <label class="checkbox-label">
        <input type="checkbox" v-model="showOnlyAssignedBeds" />
        <span>Only show beds with guests assigned</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="flatTableMode" />
        <span>Flat table (for cutting into strips)</span>
      </label>
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
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.indivGrp" />
          <span>Indiv/Grp?</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.notes" />
          <span>Notes</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.retreat" />
          <span>Retreat</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.ratePerNight" />
          <span>Rate/Night</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.priceQuoted" />
          <span>Price Quoted</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.amountPaid" />
          <span>Amount Paid</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.firstVisit" />
          <span>First Visit</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.roomPreference" />
          <span>Rm Preference</span>
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

      <!-- Flat Table Mode (for cutting into strips) -->
      <div v-if="flatTableMode" class="flat-table-section">
        <table class="flat-table">
          <thead>
            <tr>
              <th>Dorm</th>
              <th>Room</th>
              <th v-if="columns.bedInfo">Bed</th>
              <th v-if="columns.guestName">Guest Name</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.lowerBunk">Lower Bunk?</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
              <th v-if="columns.indivGrp">Indiv/Grp?</th>
              <th v-if="columns.notes">Notes</th>
              <th v-if="columns.retreat">Retreat</th>
              <th v-if="columns.ratePerNight">Rate/Night</th>
              <th v-if="columns.priceQuoted">Price Quoted</th>
              <th v-if="columns.amountPaid">Amount Paid</th>
              <th v-if="columns.firstVisit">First Visit</th>
              <th v-if="columns.roomPreference">Rm Preference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(bed, index) in flatBedList" :key="index">
              <td>{{ bed.dormName }}</td>
              <td>{{ bed.roomName }}</td>
              <td v-if="columns.bedInfo" class="bed-info">{{ bed.bedPosition }} {{ bed.bedType }}</td>
              <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(bed.guestId) }}</td>
              <td v-if="columns.gender">{{ getGuestField(bed.guestId, 'gender') }}</td>
              <td v-if="columns.age">{{ getGuestField(bed.guestId, 'age') }}</td>
              <td v-if="columns.group">{{ getGuestField(bed.guestId, 'groupName') }}</td>
              <td v-if="columns.lowerBunk">{{ getGuestField(bed.guestId, 'lowerBunk') }}</td>
              <td v-if="columns.arrival">{{ getGuestField(bed.guestId, 'arrival') }}</td>
              <td v-if="columns.departure">{{ getGuestField(bed.guestId, 'departure') }}</td>
              <td v-if="columns.indivGrp">{{ getGuestField(bed.guestId, 'indivGrp') }}</td>
              <td v-if="columns.notes">{{ getGuestField(bed.guestId, 'notes') }}</td>
              <td v-if="columns.retreat">{{ getGuestField(bed.guestId, 'retreat') }}</td>
              <td v-if="columns.ratePerNight">{{ getGuestField(bed.guestId, 'ratePerNight') }}</td>
              <td v-if="columns.priceQuoted">{{ getGuestField(bed.guestId, 'priceQuoted') }}</td>
              <td v-if="columns.amountPaid">{{ getGuestField(bed.guestId, 'amountPaid') }}</td>
              <td v-if="columns.firstVisit">{{ getGuestField(bed.guestId, 'firstVisit') }}</td>
              <td v-if="columns.roomPreference">{{ getGuestField(bed.guestId, 'roomPreference') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Room Assignments by Dormitory (grouped view) -->
      <template v-else>
        <div
          v-for="(dormitory, dormIndex) in dormitoryStore.dormitories.filter(d => !showOnlyAssignedBeds || dormHasAssignedGuests(d))"
          :key="dormIndex"
          class="dormitory-section"
        >
          <h3 class="dormitory-name">{{ dormitory.dormitoryName }}</h3>

          <div
            v-for="(room, roomIndex) in dormitory.rooms.filter(r => r.active && (!showOnlyAssignedBeds || roomHasAssignedGuests(r)))"
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
                  <th v-if="columns.indivGrp">Indiv/Grp?</th>
                  <th v-if="columns.notes">Notes</th>
                  <th v-if="columns.retreat">Retreat</th>
                  <th v-if="columns.ratePerNight">Rate/Night</th>
                  <th v-if="columns.priceQuoted">Price Quoted</th>
                  <th v-if="columns.amountPaid">Amount Paid</th>
                  <th v-if="columns.firstVisit">First Visit</th>
                  <th v-if="columns.roomPreference">Rm Preference</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bed in room.beds.filter(b => b.active !== false && (!showOnlyAssignedBeds || b.assignedGuestId))" :key="bed.bedId">
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
                  <td v-if="columns.indivGrp">{{ getGuestField(bed.assignedGuestId, 'indivGrp') }}</td>
                  <td v-if="columns.notes">{{ getGuestField(bed.assignedGuestId, 'notes') }}</td>
                  <td v-if="columns.retreat">{{ getGuestField(bed.assignedGuestId, 'retreat') }}</td>
                  <td v-if="columns.ratePerNight">{{ getGuestField(bed.assignedGuestId, 'ratePerNight') }}</td>
                  <td v-if="columns.priceQuoted">{{ getGuestField(bed.assignedGuestId, 'priceQuoted') }}</td>
                  <td v-if="columns.amountPaid">{{ getGuestField(bed.assignedGuestId, 'amountPaid') }}</td>
                  <td v-if="columns.firstVisit">{{ getGuestField(bed.assignedGuestId, 'firstVisit') }}</td>
                  <td v-if="columns.roomPreference">{{ getGuestField(bed.assignedGuestId, 'roomPreference') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

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
              <th v-if="columns.indivGrp">Indiv/Grp?</th>
              <th v-if="columns.notes">Notes</th>
              <th v-if="columns.retreat">Retreat</th>
              <th v-if="columns.ratePerNight">Rate/Night</th>
              <th v-if="columns.priceQuoted">Price Quoted</th>
              <th v-if="columns.amountPaid">Amount Paid</th>
              <th v-if="columns.firstVisit">First Visit</th>
              <th v-if="columns.roomPreference">Rm Preference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guestId in assignmentStore.unassignedGuestIds" :key="guestId">
              <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(guestId) }}</td>
              <td v-if="columns.gender">{{ getGuestFieldById(guestId, 'gender') }}</td>
              <td v-if="columns.age">{{ getGuestFieldById(guestId, 'age') }}</td>
              <td v-if="columns.group">{{ getGuestFieldById(guestId, 'groupName') }}</td>
              <td v-if="columns.lowerBunk">{{ getGuestFieldById(guestId, 'lowerBunk') }}</td>
              <td v-if="columns.arrival">{{ getGuestFieldById(guestId, 'arrival') }}</td>
              <td v-if="columns.departure">{{ getGuestFieldById(guestId, 'departure') }}</td>
              <td v-if="columns.indivGrp">{{ getGuestFieldById(guestId, 'indivGrp') }}</td>
              <td v-if="columns.notes">{{ getGuestFieldById(guestId, 'notes') }}</td>
              <td v-if="columns.retreat">{{ getGuestFieldById(guestId, 'retreat') }}</td>
              <td v-if="columns.ratePerNight">{{ getGuestFieldById(guestId, 'ratePerNight') }}</td>
              <td v-if="columns.priceQuoted">{{ getGuestFieldById(guestId, 'priceQuoted') }}</td>
              <td v-if="columns.amountPaid">{{ getGuestFieldById(guestId, 'amountPaid') }}</td>
              <td v-if="columns.firstVisit">{{ getGuestFieldById(guestId, 'firstVisit') }}</td>
              <td v-if="columns.roomPreference">{{ getGuestFieldById(guestId, 'roomPreference') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import type { Dormitory } from '@/types'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'
import { useUtils } from '@/shared/composables/useUtils'
import type { Room } from '@/types'

const STORAGE_KEY = 'dormAssignments-printPreferences'

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
  indivGrp: false,
  notes: false,
  retreat: false,
  ratePerNight: false,
  priceQuoted: false,
  amountPaid: false,
  firstVisit: false,
  roomPreference: false,
})

// Display options
const showOnlyAssignedBeds = ref(false)
const flatTableMode = ref(false)

// Load preferences from localStorage
function loadPreferences() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const prefs = JSON.parse(saved)
      if (prefs.columns) {
        Object.assign(columns, prefs.columns)
      }
      if (prefs.showOnlyAssignedBeds !== undefined) {
        showOnlyAssignedBeds.value = prefs.showOnlyAssignedBeds
      }
      if (prefs.flatTableMode !== undefined) {
        flatTableMode.value = prefs.flatTableMode
      }
    }
  } catch (e) {
    console.warn('Failed to load print preferences:', e)
  }
}

// Save preferences to localStorage
function savePreferences() {
  try {
    const prefs = {
      columns: { ...columns },
      showOnlyAssignedBeds: showOnlyAssignedBeds.value,
      flatTableMode: flatTableMode.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('Failed to save print preferences:', e)
  }
}

// Load on mount
onMounted(() => {
  loadPreferences()
})

// Watch for changes and save
watch([() => ({ ...columns }), showOnlyAssignedBeds, flatTableMode], savePreferences, { deep: true })

// Flat list of all beds with dorm/room info for strip mode
const flatBedList = computed(() => {
  const beds: Array<{
    dormName: string
    roomName: string
    roomGender: string
    bedPosition: string
    bedType: string
    guestId: string | null
  }> = []

  for (const dorm of dormitoryStore.dormitories) {
    for (const room of dorm.rooms) {
      if (!room.active) continue
      if (showOnlyAssignedBeds.value && !roomHasAssignedGuests(room)) continue

      for (const bed of room.beds) {
        if (bed.active === false) continue
        if (showOnlyAssignedBeds.value && !bed.assignedGuestId) continue

        beds.push({
          dormName: dorm.dormitoryName,
          roomName: room.roomName,
          roomGender: room.roomGender,
          bedPosition: String(bed.position),
          bedType: bed.bedType,
          guestId: bed.assignedGuestId || null,
        })
      }
    }
  }

  return beds
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

function roomHasAssignedGuests(room: Room): boolean {
  return room.beds.some(bed => bed.assignedGuestId)
}

function dormHasAssignedGuests(dormitory: { rooms: Room[] }): boolean {
  return dormitory.rooms.some(room => room.active && roomHasAssignedGuests(room))
}

function getGuestName(guestId: string | null): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  return guest ? createDisplayName(guest) : '—'
}

function getGuestFullName(guestId: string | null): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  if (!guest) return '—'
  const firstName = guest.preferredName || guest.firstName || ''
  const lastName = guest.lastName || ''
  return `${firstName} ${lastName}`.trim() || '—'
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

.display-options {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
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

.flat-table-section {
  margin-bottom: 32px;
}

.flat-table {
  width: 100%;
  border-collapse: collapse;

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
