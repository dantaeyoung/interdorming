<template>
  <div id="app" class="app-container">
    <!-- Header -->
    <div class="header">
      <h1>Blue Cliff Monastery Dorm Assignment Tool</h1>
      <p>Drag and drop guests to assign them to dormitory beds</p>
    </div>

    <!-- Tab Navigation -->
    <TabNavigation v-model="activeTab" :tabs="tabs" @change="handleTabChange" />

    <!-- Guest Assignment Tab -->
    <div v-show="activeTab === 'assignment'" class="tab-content">
      <!-- CSV Upload Section -->
      <div class="upload-section">
        <GuestCSVUpload
          label="Upload CSV File"
          :show-load-test="true"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
          @load-test-data="handleLoadTestData"
        />
      </div>

      <!-- Assignment Toolbar -->
      <AssignmentToolbar
        @auto-place="handleAutoPlace"
        @accept-all="handleAcceptAll"
        @clear-suggestions="handleClearSuggestions"
        @undo="handleUndo"
        @export="handleExport"
        @reset-assignments="handleResetAssignments"
        @delete-all="handleDeleteAll"
      />

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
              <!-- Search -->
              <GuestSearch />

              <!-- Guest List -->
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
          <RoomConfigCSV />
        </div>
      </div>

      <div class="configuration-content">
        <RoomList
          empty-title="No rooms configured"
          empty-message="Import or create room configuration to begin."
        />
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-show="activeTab === 'settings'" class="tab-content">
      <div class="settings-panel">
        <h2>Settings</h2>
        <p>Settings configuration coming soon...</p>
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
import { RoomList } from '@/features/dormitories/components'
import { GuestCSVUpload, RoomConfigCSV, AssignmentCSVExport } from '@/features/csv/components'
import { AssignmentToolbar, AssignmentStats } from '@/features/assignments/components'

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
  // TODO: Implement auto-placement logic
  showStatus('Auto-placement not yet implemented', 'info')
}

function handleAcceptAll() {
  // TODO: Implement accept all suggestions
  showStatus('Accept all not yet implemented', 'info')
}

function handleClearSuggestions() {
  // TODO: Implement clear suggestions
  showStatus('Clear suggestions not yet implemented', 'info')
}

function handleUndo() {
  assignmentStore.undo()
  showStatus('Undone', 'success')
}

function handleExport() {
  // TODO: Implement CSV export
  showStatus('Export not yet implemented', 'info')
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
  min-height: 100vh;
  background-color: #f3f4f6;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  h1 {
    margin: 0 0 8px 0;
    font-size: 2rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 1rem;
    opacity: 0.95;
  }
}

.tab-content {
  padding: 20px;
}

.upload-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-message {
  padding: 12px 20px;
  margin-bottom: 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;

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
  gap: 20px;
  margin-top: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.panel {
  min-height: 400px;
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
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
  border-radius: 8px 8px 0 0;
}

.card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.card-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.card-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: white;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.configuration-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 500px;
}

.settings-panel {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  p {
    margin: 0;
    color: #6b7280;
  }
}
</style>
