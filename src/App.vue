<template>
  <div id="app" class="app-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>
          Interdorming: Dorm Assignment Tool
          <span v-if="currentBranch && currentBranch !== 'main'" class="branch-indicator">
            ({{ currentBranch }} branch)
          </span>
        </h1>
        <button class="tour-btn" @click="startTour" title="Take a guided tour">
          ?
        </button>
        <!-- Contextual Hints Toast -->
        <HintBanner
          :current-tab="activeTab"
          @action="handleHintAction"
        />
      </div>
      <div class="header-right">
        <Transition name="status-fade">
          <div v-if="statusMessage" class="header-status" :class="statusMessageType">
            {{ statusMessage }}
          </div>
        </Transition>
        <AssignmentStats class="header-stats" data-tour="header-stats" />
      </div>
    </div>

    <!-- Tab Navigation -->
    <TabNavigation
      v-model="activeTab"
      :tabs="tabs"
      :highlighted-tab="highlightedTab"
      @change="handleTabChange"
    />

    <!-- Guest Data Tab -->
    <div v-show="activeTab === 'guest-data'" class="tab-content">
      <GuestDataView @status="handleGuestDataStatus" />
    </div>

    <!-- Guest Assignment Tab -->
    <div v-show="activeTab === 'assignment'" class="tab-content">
      <!-- Toolbar Section -->
      <div class="combined-toolbar">
        <div class="toolbar-left-section">
          <button class="btn-sort" @click="showSortModal = true" :title="sortDescription">
            <span class="sort-icon">↕</span>
            Sort
            <span v-if="hasSortLevels" class="sort-indicator">*</span>
          </button>
        </div>
        <div class="toolbar-right-section">
          <AssignmentToolbar
            @export="handleExport"
            @export-excel="handleExportExcel"
          />
        </div>
      </div>

      <!-- Two-Panel Layout -->
      <div class="layout-grid">
        <!-- Left Panel: Unassigned Guests -->
        <div class="panel left-panel" :style="{ flexBasis: `calc(${leftPanelWidth}% - 4px)` }">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Unassigned Guests</h3>
              <span class="card-subtitle">({{ unassignedCount }})</span>
            </div>
            <div class="card-body">
              <!-- Search and Add Guest - Fixed at top -->
              <div class="search-section">
                <GuestSearch />
                <button class="btn-add-guest-sm" @click="handleAddGuestClick">+ Add</button>
              </div>

              <!-- Guest List - Scrollable -->
              <div class="panel-content">
                <GuestList
                  ref="guestListRef"
                  :show-assigned="false"
                  empty-title="No guests loaded"
                  empty-message="Upload a CSV file to begin assigning guests to dormitory beds."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Resizable Divider -->
        <div
          class="divider"
          @mousedown="startResize"
        >
          <div class="divider-handle"></div>
        </div>

        <!-- Right Panel: Room Assignments -->
        <div class="panel right-panel" :style="{ flexBasis: `calc(${rightPanelWidth}% - 4px)` }">
          <div class="card">
            <div class="card-header">
              <div class="card-header-left">
                <h3 class="card-title">Room Assignments</h3>
                <span class="card-subtitle">({{ assignedCount }})</span>
                <button
                  class="btn btn-auto-place"
                  :disabled="guestStore.guests.length === 0"
                  @click="handleAutoPlace"
                >
                  Auto-place
                </button>
              </div>
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

    <!-- Timeline Tab -->
    <div v-show="activeTab === 'timeline'" class="tab-content">
      <div class="scrollable-content">
        <TimelineView />
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

    <!-- Sort Config Modal -->
    <SortConfigModal
      :show="showSortModal"
      @close="showSortModal = false"
    />

    <!-- Floating Action Bar - visible on Table View and Timeline View -->
    <FloatingActionBar
      v-if="activeTab === 'assignment' || activeTab === 'timeline'"
      @undo="handleUndo"
      @redo="handleRedo"
      @reset-assignments="handleResetAssignments"
      @accept-all="handleAcceptAll"
      @clear-suggestions="handleClearSuggestions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'

// Shared components
import { TabNavigation, ConfirmDialog, FloatingActionBar, SortConfigModal } from '@/shared/components'
import { useSortConfig } from '@/shared/composables/useSortConfig'

// Feature components
import { HintBanner } from '@/features/hints/components'
import { useHints } from '@/features/hints/composables/useHints'
import { useTour } from '@/features/hints/composables/useTour'
import { GuestList, GuestSearch } from '@/features/guests/components'
import { RoomList, ConfigRoomList } from '@/features/dormitories/components'
import { RoomConfigCSV, AssignmentCSVExport } from '@/features/csv/components'
import { AssignmentToolbar, AssignmentStats } from '@/features/assignments/components'
import { SettingsPanel } from '@/features/settings/components'
import { PrintView } from '@/features/print/components'
import { TimelineView } from '@/features/timeline/components'
import { GuestDataView } from '@/features/guest-data/components'

// Composables
import { useCSV } from '@/features/csv/composables/useCSV'
import { useExcelExport } from '@/features/export/composables/useExcelExport'

import type { Guest } from '@/types'
import type { Tab } from '@/shared/components/TabNavigation.vue'

// Stores
const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()

// Sort configuration
const { hasSortLevels, sortDescription } = useSortConfig()
const showSortModal = ref(false)

// Git branch detection
const currentBranch = ref<string | null>(null)

onMounted(() => {
  // Try to detect git branch from environment variable (set during build)
  currentBranch.value = import.meta.env.VITE_GIT_BRANCH || null
})

// Tab state - restore from localStorage or default to 'guest-data'
const ACTIVE_TAB_KEY = 'dormAssignments-activeTab'
const savedTab = localStorage.getItem(ACTIVE_TAB_KEY)
const validTabs = ['guest-data', 'assignment', 'timeline', 'configuration', 'print', 'settings']
const activeTab = ref(savedTab && validTabs.includes(savedTab) ? savedTab : 'guest-data')

// Hints - get highlightedTab for TabNavigation
const { highlightedTab } = useHints(activeTab)

// Tour - pass handleTabChange so tour can switch tabs when highlighting them
const { startTour, hasSeenTour } = useTour({
  switchTab: (tabId: string) => handleTabChange(tabId)
})
const tabs: Tab[] = [
  { id: 'guest-data', label: 'Guest Data' },
  { id: 'assignment', label: 'Table View' },
  { id: 'timeline', label: 'Timeline View' },
  { id: 'configuration', label: 'Room Configuration' },
  { id: 'print', label: 'Print' },
  { id: 'settings', label: 'Settings' },
]

// Status message
const statusMessage = ref('')
const statusMessageType = ref<'success' | 'error' | 'info'>('info')

// Confirm dialog state
const showConfirmDialog = ref(false)

// Panel resize state
const leftPanelWidth = ref(50)
const rightPanelWidth = computed(() => 100 - leftPanelWidth.value)
const isResizing = ref(false)
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

// Guest list ref for add guest modal
const guestListRef = ref<InstanceType<typeof GuestList> | null>(null)

function handleAddGuestClick() {
  guestListRef.value?.openAddModal()
}

// Tab handlers
function handleTabChange(tabId: string) {
  activeTab.value = tabId
  // Persist to localStorage
  localStorage.setItem(ACTIVE_TAB_KEY, tabId)
}

// Hint banner handlers
function handleHintAction(action: string) {
  switch (action) {
    case 'upload-csv':
      // Navigate to guest data tab where upload is
      handleTabChange('guest-data')
      break
    case 'load-sample':
      // Load sample data
      handleLoadSampleData()
      break
    case 'export':
      // Trigger export
      handleExport()
      break
  }
}

async function handleLoadSampleData() {
  try {
    // First load default rooms if none exist
    if (dormitoryStore.dormitories.length === 0) {
      await handleLoadDefaultRooms()
    }

    // Then load sample guests
    const sampleGuests = [
      { id: crypto.randomUUID(), firstName: 'John', lastName: 'Smith', gender: 'M' as const, age: 45, groupName: 'Smith Family', lowerBunk: false, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Jane', lastName: 'Smith', gender: 'F' as const, age: 42, groupName: 'Smith Family', lowerBunk: false, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Tommy', lastName: 'Smith', gender: 'M' as const, age: 12, groupName: 'Smith Family', lowerBunk: false, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Sarah', lastName: 'Johnson', gender: 'F' as const, age: 65, groupName: '', lowerBunk: true, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Michael', lastName: 'Chen', gender: 'M' as const, age: 35, groupName: '', lowerBunk: false, preferredName: 'Mike', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Emily', lastName: 'Davis', gender: 'F' as const, age: 28, groupName: 'Davis Sisters', lowerBunk: false, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Anna', lastName: 'Davis', gender: 'F' as const, age: 25, groupName: 'Davis Sisters', lowerBunk: false, preferredName: '', arrival: '', departure: '' },
      { id: crypto.randomUUID(), firstName: 'Robert', lastName: 'Wilson', gender: 'M' as const, age: 55, groupName: '', lowerBunk: true, preferredName: 'Bob', arrival: '', departure: '' },
    ]

    guestStore.importGuests(sampleGuests)
    showStatus(`Loaded ${sampleGuests.length} sample guests`, 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load sample data'
    showStatus(`Error: ${errorMessage}`, 'error')
  }
}

// Guest Data tab handlers
function handleGuestDataStatus(message: string, type: 'success' | 'error' | 'info') {
  showStatus(message, type)
}

// Assignment toolbar handlers
function handleAutoPlace() {
  try {
    const result = assignmentStore.autoPlace()

    if (result.placedCount === 0) {
      showStatus('No suggestions made. Check settings or room availability.', 'info')
    } else if (result.unplacedCount === 0) {
      showStatus(
        `${result.placedCount} suggested placements created. Accept or adjust them, then click "Accept All".`,
        'success'
      )
    } else {
      showStatus(
        `${result.placedCount} suggestions created, ${result.unplacedCount} guests could not be placed.`,
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

function handleRedo() {
  assignmentStore.redo()
  showStatus('Redone', 'success')
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

function handleExportExcel() {
  try {
    const { exportAssignmentsToExcel } = useExcelExport()
    exportAssignmentsToExcel()
    showStatus('Excel file exported successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export Excel'
    showStatus(`Error exporting Excel: ${errorMessage}`, 'error')
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

// Panel resize handlers
function startResize(e: MouseEvent) {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
  e.stopPropagation()
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return

  const container = document.querySelector('.layout-grid') as HTMLElement
  if (!container) return

  const containerRect = container.getBoundingClientRect()

  // Mouse position relative to container
  const mouseX = e.clientX - containerRect.left

  // Calculate percentage based on full container width
  let percentage = (mouseX / containerRect.width) * 100

  // Constrain between 20% and 80%
  percentage = Math.max(20, Math.min(80, percentage))

  leftPanelWidth.value = percentage
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
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
  background: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    .branch-indicator {
      -webkit-text-fill-color: #ff6b6b;
      font-size: 0.875rem;
      font-weight: 500;
      margin-left: 8px;
    }
  }
}

.tour-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(180, 83, 9, 0.3);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(180, 83, 9, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }
}

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-status {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;

  &.success {
    background-color: rgba(209, 250, 229, 0.95);
    color: #065f46;
    border: 1px solid rgba(110, 231, 183, 0.8);
  }

  &.error {
    background-color: rgba(254, 226, 226, 0.95);
    color: #991b1b;
    border: 1px solid rgba(252, 165, 165, 0.8);
  }

  &.info {
    background-color: rgba(219, 234, 254, 0.95);
    color: #1e40af;
    border: 1px solid rgba(147, 197, 253, 0.8);
  }
}

// Status fade transition - fast in (300ms), slow out (2s)
.status-fade-enter-active {
  transition: opacity 0.3s ease-out;
}

.status-fade-leave-active {
  transition: opacity 2s ease-in;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
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

.btn-sort {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .sort-icon {
    font-size: 0.9rem;
  }

  .sort-indicator {
    color: #3b82f6;
    font-weight: 700;
  }
}

.layout-grid {
  display: flex;
  gap: 0;
  padding: 12px 16px;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
}

.panel {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  flex-grow: 0;
  flex-shrink: 1;
}

.divider {
  width: 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  user-select: none;

  &:hover .divider-handle {
    background-color: #3b82f6;
  }

  &:active .divider-handle {
    background-color: #2563eb;
  }
}

.divider-handle {
  width: 4px;
  height: 60px;
  background-color: #d1d5db;
  border-radius: 2px;
  transition: background-color 0.2s;
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

.card-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-auto-place {
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background-color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-add-guest-sm {
  padding: 6px 10px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #2563eb;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  min-height: 0;
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

<!-- Global styles for Driver.js tour popover -->
<style lang="scss">
.driver-popover.dorm-tour-popover {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  .driver-popover-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .driver-popover-description {
    color: #4b5563;
    font-size: 0.925rem;
    line-height: 1.5;
  }

  .driver-popover-progress-text {
    color: #9ca3af;
    font-size: 0.8rem;
  }

  .driver-popover-prev-btn,
  .driver-popover-next-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .driver-popover-prev-btn {
    background: #f3f4f6;
    color: #4b5563;
    border: 1px solid #d1d5db;

    &:hover {
      background: #e5e7eb;
    }
  }

  .driver-popover-next-btn,
  .driver-popover-close-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;

    &:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
  }

  .driver-popover-close-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .driver-popover-arrow-side-left,
  .driver-popover-arrow-side-right,
  .driver-popover-arrow-side-top,
  .driver-popover-arrow-side-bottom {
    &.driver-popover-arrow {
      border-color: white;
    }
  }
}
</style>
