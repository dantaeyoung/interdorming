<template>
  <div id="app" class="app-container">
    <!-- Header -->
    <div class="header">
      <h1>Dorm Assignment Tool</h1>
      <p>Drag and drop guests to assign them to dormitory beds</p>
    </div>

    <!-- Tab Navigation -->
    <TabNavigation v-model="activeTab" :tabs="tabs" @change="handleTabChange" />

    <!-- Guest Assignment Tab -->
    <div v-show="activeTab === 'assignment'" class="tab-content">
      <!-- Combined Upload & Toolbar Section -->
      <div class="combined-toolbar">
        <div class="toolbar-left-section">
          <GuestCSVUpload
            label=""
            :show-load-test="true"
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
            @load-test-data="handleLoadTestData"
          />
        </div>

        <div class="toolbar-right-section">
          <AssignmentToolbar
            @auto-place="handleAutoPlace"
            @accept-all="handleAcceptAll"
            @clear-suggestions="handleClearSuggestions"
            @undo="handleUndo"
            @export="handleExport"
            @reset-assignments="handleResetAssignments"
            @delete-all="handleDeleteAll"
          />
        </div>
      </div>

      <!-- Assignment Stats -->
      <AssignmentStats />

      <!-- Status Message -->
      <div v-if="statusMessage" class="status-message" :class="statusMessageType">
        {{ statusMessage }}
      </div>

      <!-- Two-Panel Layout -->
      <div class="layout-grid">
        <!-- Left Panel: Unassigned Guests -->
        <div class="panel">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Unassigned Guests</h3>
              <span class="card-subtitle">({{ unassignedCount }})</span>
            </div>
            <div class="card-body">
              <!-- Search - Fixed at top -->
              <div class="search-section">
                <GuestSearch />
              </div>

              <!-- Guest List - Scrollable -->
              <div class="panel-content">
                <GuestList
                  :show-assigned="false"
                  empty-title="No guests loaded"
                  empty-message="Upload a CSV file to begin assigning guests to dormitory beds."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Room Assignments -->
        <div class="panel">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Room Assignments</h3>
              <span class="card-subtitle">({{ assignedCount }})</span>
            </div>
            <div class="card-body">
              <div class="panel-content">
                <RoomList
                  empty-title="No rooms configured"
                  empty-message="Room layout will appear here once configured."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Configuration Tab -->
    <div v-show="activeTab === 'configuration'" class="tab-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <h2>Room Configuration</h2>
        </div>
        <div class="toolbar-right">
          <RoomConfigCSV
            :show-load-default="true"
            @load-default-rooms="handleLoadDefaultRooms"
            @import-success="handleRoomImportSuccess"
            @import-error="handleRoomImportError"
            @export-success="handleRoomExportSuccess"
            @export-error="handleRoomExportError"
          />
        </div>
      </div>

      <div class="scrollable-content">
        <ConfigRoomList
          empty-title="No rooms configured"
          empty-message="Add a dormitory to begin configuring rooms and beds."
        />
      </div>
    </div>

    <!-- Print Tab -->
    <div v-show="activeTab === 'print'" class="tab-content">
      <div class="scrollable-content">
        <PrintView />
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-show="activeTab === 'settings'" class="tab-content">
      <div class="scrollable-content">
        <SettingsPanel />
      </div>
    </div>

    <!-- Modals & Dialogs -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'

// Shared components
import { TabNavigation, ConfirmDialog } from '@/shared/components'

// Feature components
import { GuestList, GuestSearch } from '@/features/guests/components'
import { RoomList, ConfigRoomList } from '@/features/dormitories/components'
import { GuestCSVUpload, RoomConfigCSV, AssignmentCSVExport } from '@/features/csv/components'
import { AssignmentToolbar, AssignmentStats } from '@/features/assignments/components'
import { SettingsPanel } from '@/features/settings/components'
import { PrintView } from '@/features/print/components'

// Composables
import { useCSV } from '@/features/csv/composables/useCSV'

import type { Guest } from '@/types'
import type { Tab } from '@/shared/components/TabNavigation.vue'

// Stores
const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()

// Tab state
const activeTab = ref('assignment')
const tabs: Tab[] = [
  { id: 'assignment', label: 'Guest Assignment' },
  { id: 'configuration', label: 'Room Configuration' },
  { id: 'print', label: 'Print' },
  { id: 'settings', label: 'Settings' },
]

// Status message
const statusMessage = ref('')
const statusMessageType = ref<'success' | 'error' | 'info'>('info')

// Confirm dialog state
const showConfirmDialog = ref(false)
const confirmDialog = ref({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
})

// Computed properties
const unassignedCount = computed(() => assignmentStore.unassignedCount)
const assignedCount = computed(() => assignmentStore.assignedCount)

// Tab handlers
function handleTabChange(tabId: string) {
  activeTab.value = tabId
}

// CSV Upload handlers
function handleUploadSuccess(guests: Guest[]) {
  showStatus(`Successfully loaded ${guests.length} guests`, 'success')
}

function handleUploadError(error: string) {
  showStatus(`Error: ${error}`, 'error')
}

async function handleLoadTestData() {
  try {
    // Fetch test guest data from public folder
    const response = await fetch('/test_guests.csv')
    if (!response.ok) {
      throw new Error('Failed to fetch test data')
    }

    const csvText = await response.text()

    // Parse CSV using the CSV composable
    const { useCSV } = await import('@/features/csv/composables/useCSV')
    const { parseGuestCSV } = useCSV()
    const guests = parseGuestCSV(csvText)

    // Import guests into store
    guestStore.importGuests(guests)

    // Initialize default dormitories if none exist
    if (dormitoryStore.dormitories.length === 0) {
      dormitoryStore.initializeDefaultDormitories()
    }

    showStatus(`Successfully loaded ${guests.length} test guests and default room configuration`, 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load test data'
    showStatus(`Error loading test data: ${errorMessage}`, 'error')
  }
}

// Assignment toolbar handlers
function handleAutoPlace() {
  try {
    const result = assignmentStore.autoPlace()

    if (result.placedCount === 0) {
      showStatus('No placements made. Check settings or room availability.', 'info')
    } else if (result.unplacedCount === 0) {
      showStatus(
        `Auto-placement complete! All ${result.placedCount} guests successfully assigned.`,
        'success'
      )
    } else {
      showStatus(
        `Auto-placement complete: ${result.placedCount} guests assigned, ${result.unplacedCount} remaining unplaced.`,
        'info'
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Auto-placement failed'
    showStatus(`Error: ${errorMessage}`, 'error')
  }
}

function handleAcceptAll() {
  const suggestionCount = assignmentStore.suggestedAssignments.size

  if (suggestionCount === 0) {
    showStatus('No suggestions to accept', 'info')
    return
  }

  assignmentStore.acceptAllSuggestions()
  showStatus(`Accepted ${suggestionCount} suggested assignments`, 'success')
}

function handleClearSuggestions() {
  const suggestionCount = assignmentStore.suggestedAssignments.size

  if (suggestionCount === 0) {
    showStatus('No suggestions to clear', 'info')
    return
  }

  assignmentStore.clearSuggestions()
  showStatus(`Cleared ${suggestionCount} suggested assignments`, 'info')
}

function handleUndo() {
  assignmentStore.undo()
  showStatus('Undone', 'success')
}

function handleExport() {
  try {
    const { generateCSV, downloadCSV, generateTimestampedFilename } = useCSV()

    const exportData = guestStore.guests.map(guest => {
      const bedId = assignmentStore.getAssignmentByGuest(guest.id)
      const room = bedId ? dormitoryStore.getRoomByBedId(bedId) : undefined

      return {
        firstName: guest.firstName,
        lastName: guest.lastName,
        preferredName: guest.preferredName || '',
        gender: guest.gender,
        age: guest.age,
        groupName: guest.groupName || '',
        lowerBunk: guest.lowerBunk ? 'Yes' : 'No',
        arrival: guest.arrival || '',
        departure: guest.departure || '',
        dormitory: room?.dormitoryName || '',
        assignedRoom: room?.roomName || '',
        assignedBed: bedId || '',
      }
    })

    const columns = [
      { key: 'firstName' as const, label: 'First Name' },
      { key: 'lastName' as const, label: 'Last Name' },
      { key: 'preferredName' as const, label: 'Preferred Name' },
      { key: 'gender' as const, label: 'Gender' },
      { key: 'age' as const, label: 'Age' },
      { key: 'groupName' as const, label: 'Group Name' },
      { key: 'lowerBunk' as const, label: 'Lower Bunk' },
      { key: 'arrival' as const, label: 'Arrival' },
      { key: 'departure' as const, label: 'Departure' },
      { key: 'dormitory' as const, label: 'Dormitory' },
      { key: 'assignedRoom' as const, label: 'Assigned Room' },
      { key: 'assignedBed' as const, label: 'Assigned Bed' },
    ]

    const csvContent = generateCSV(exportData, columns)
    const filename = generateTimestampedFilename('dorm_assignments', '.csv')

    downloadCSV(csvContent, filename)
    showStatus('CSV exported successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export CSV'
    showStatus(`Error exporting CSV: ${errorMessage}`, 'error')
  }
}

function handleResetAssignments() {
  confirmAction(
    'Reset All Assignments',
    'Are you sure you want to reset all guest assignments? This cannot be undone.',
    () => {
      assignmentStore.clearAllAssignments()
      showStatus('All assignments cleared', 'success')
    }
  )
}

function handleDeleteAll() {
  confirmAction(
    'Delete All People Data',
    'Are you sure you want to delete all guest data? This cannot be undone.',
    () => {
      guestStore.clearAllGuests()
      assignmentStore.clearAllAssignments()
      showStatus('All guest data deleted', 'success')
    }
  )
}

// Room configuration handlers
async function handleLoadDefaultRooms() {
  try {
    // Fetch default room config from public folder
    const response = await fetch('/default_room_config.csv')
    if (!response.ok) {
      throw new Error('Failed to fetch default room configuration')
    }

    const csvText = await response.text()

    // Parse CSV using the CSV composable
    const { useCSV } = await import('@/features/csv/composables/useCSV')
    const { parseCSVRow } = useCSV()

    // Parse room config
    const dormitories = parseRoomConfigCSV(csvText, parseCSVRow)

    // Import into store
    dormitoryStore.importDormitories(dormitories)

    showStatus(`Successfully loaded default room configuration with ${dormitories.length} dormitories`, 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load default room configuration'
    showStatus(`Error loading default rooms: ${errorMessage}`, 'error')
  }
}

function handleRoomImportSuccess(dormitories: any[]) {
  showStatus(`Successfully imported ${dormitories.length} dormitories`, 'success')
}

function handleRoomImportError(error: string) {
  showStatus(`Error importing rooms: ${error}`, 'error')
}

function handleRoomExportSuccess() {
  showStatus('Room configuration exported successfully', 'success')
}

function handleRoomExportError(error: string) {
  showStatus(`Error exporting rooms: ${error}`, 'error')
}

// Helper function to parse room config CSV
function parseRoomConfigCSV(csvText: string, parseCSVRow: (row: string) => string[]): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const dormitoriesMap = new Map<string, any>()

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i])

    const dormitoryName = values[headers.indexOf('Dormitory Name')]?.trim()
    const roomName = values[headers.indexOf('Room Name')]?.trim()
    const bedId = values[headers.indexOf('Bed ID')]?.trim()

    if (!dormitoryName || !roomName || !bedId) continue

    // Get or create dormitory
    if (!dormitoriesMap.has(dormitoryName)) {
      dormitoriesMap.set(dormitoryName, {
        dormitoryName,
        active: values[headers.indexOf('Dormitory Active')]?.toLowerCase() !== 'no' && values[headers.indexOf('Active')]?.toLowerCase() !== 'false',
        color: values[headers.indexOf('Dormitory Color')] || '#f8f9fa',
        rooms: [],
      })
    }

    const dormitory = dormitoriesMap.get(dormitoryName)!
    let room = dormitory.rooms.find((r: any) => r.roomName === roomName)

    // Create room if doesn't exist
    if (!room) {
      room = {
        roomName,
        roomGender: (values[headers.indexOf('Room Gender')] || 'M') as any,
        active: values[headers.indexOf('Room Active')]?.toLowerCase() !== 'no' && values[headers.indexOf('Active')]?.toLowerCase() !== 'false',
        beds: [],
      }
      dormitory.rooms.push(room)
    }

    // Add bed
    room.beds.push({
      bedId,
      bedType: (values[headers.indexOf('Bed Type')] || 'single') as any,
      position: parseInt(values[headers.indexOf('Bed Position')] || '1'),
      assignedGuestId: null,
      active: values[headers.indexOf('Bed Active')]?.toLowerCase() !== 'no' && values[headers.indexOf('Active')]?.toLowerCase() !== 'false',
    })
  }

  return Array.from(dormitoriesMap.values())
}

// Utility functions
function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message
  statusMessageType.value = type

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.value = ''
  }, 5000)
}

function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
) {
  confirmDialog.value = {
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
  }
  showConfirmDialog.value = true
}

function handleConfirmDialogConfirm() {
  confirmDialog.value.onConfirm()
  showConfirmDialog.value = false
}

function handleConfirmDialogCancel() {
  showConfirmDialog.value = false
}
</script>

<style scoped lang="scss">
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f3f4f6;
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  h1 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  p {
    display: none;
  }
}

.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.combined-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right-section {
  flex: 1;
}

.status-message {
  padding: 8px 16px;
  margin: 8px 16px 0;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  flex-shrink: 0;

  &.success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;
  }

  &.error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  &.info {
    background-color: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  }
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.panel {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.card-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.card-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-section {
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background-color: #f3f4f6;
}
</style>
