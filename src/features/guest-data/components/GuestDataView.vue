<template>
  <div class="guest-data-view">
    <!-- Header with Upload Controls -->
    <div class="guest-data-header">
      <div class="header-left">
        <h2>Guest Data</h2>
        <span class="guest-count">{{ guestStore.guests.length }} guests</span>
      </div>
      <div class="header-right">
        <GuestCSVUpload
          label=""
          :show-load-test="true"
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
          @load-test-data="handleLoadTestData"
          @request-reset-confirmation="handleRequestResetConfirmation"
        />
        <button
          class="btn btn-danger"
          :disabled="guestStore.guests.length === 0"
          @click="handleDeleteAll"
        >
          Delete All
        </button>
      </div>
    </div>

    <!-- Status Message -->
    <div v-if="statusMessage" class="status-message" :class="statusMessageType">
      {{ statusMessage }}
    </div>

    <!-- Search and Add Guest Row -->
    <div class="filters-bar">
      <GuestSearch />
      <div class="filter-stats">
        <span v-if="guestStore.searchQuery">
          Showing {{ guestStore.filteredGuests.length }} of {{ guestStore.guests.length }}
        </span>
      </div>
      <button class="btn-add-guest" @click="handleAddGuest">+ Add Guest</button>
    </div>

    <!-- Guest Table -->
    <div class="guest-table-container">
      <GuestList
        ref="guestListRef"
        :show-assigned="true"
        empty-title="No guests loaded"
        empty-message="Upload a CSV file or load test data to get started."
      />
    </div>

    <!-- Future: Group Linking Section -->
    <!--
    <div class="group-linking-section">
      <h3>Group Linking</h3>
      <p>Link guests together to keep them in adjacent rooms.</p>
    </div>
    -->

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
    />

    <!-- Group Linking Cursor Tooltip -->
    <Teleport to="body">
      <div
        v-if="groupLinking.isLinking.value"
        class="linking-cursor-tooltip"
        :style="{
          left: `${groupLinking.mousePosition.value.x + 15}px`,
          top: `${groupLinking.mousePosition.value.y + 15}px`
        }"
      >
        <span class="link-icon">🔗</span>
        <span class="link-text">Link {{ groupLinking.linkingGuestName.value }} with ?</span>
        <span class="link-hint">(click a guest or press Esc)</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { GuestCSVUpload } from '@/features/csv/components'
import { GuestList, GuestSearch } from '@/features/guests/components'
import { useGroupLinking } from '@/features/guests/composables/useGroupLinking'
import { ConfirmDialog } from '@/shared/components'
import type { Guest } from '@/types'

const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()
const groupLinking = useGroupLinking()

// Ref to GuestList for triggering add modal
const guestListRef = ref<InstanceType<typeof GuestList> | null>(null)

function handleAddGuest() {
  guestListRef.value?.openAddModal()
}

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

// Emit events to parent for cross-tab communication
const emit = defineEmits<{
  'status': [message: string, type: 'success' | 'error' | 'info']
}>()

function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  statusMessage.value = message
  statusMessageType.value = type
  emit('status', message, type)

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
    const result = parseGuestCSV(csvText)

    // Import guests into store
    guestStore.importGuests(result.guests)

    // Initialize default dormitories if none exist
    if (dormitoryStore.dormitories.length === 0) {
      dormitoryStore.initializeDefaultDormitories()
    }

    showStatus(`Successfully loaded ${result.guests.length} test guests`, 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load test data'
    showStatus(`Error loading test data: ${errorMessage}`, 'error')
  }
}

function handleRequestResetConfirmation(callback: () => void) {
  confirmAction(
    'Reset and Replace',
    'Are you sure you want to clear all existing guests and assignments? This will replace them with the new CSV data. This cannot be undone.',
    () => {
      // Clear all assignments first
      assignmentStore.clearAllAssignments()
      // Execute the callback (which imports the new CSV)
      callback()
      showStatus('Guests replaced with new CSV data', 'success')
    },
    'Reset and Replace',
    'Cancel'
  )
}

function handleDeleteAll() {
  confirmAction(
    'Delete All Guest Data',
    'Are you sure you want to delete all guest data? This will also clear all room assignments. This cannot be undone.',
    () => {
      guestStore.clearAllGuests()
      assignmentStore.clearAllAssignments()
      showStatus('All guest data deleted', 'success')
    },
    'Delete All',
    'Cancel'
  )
}
</script>

<style scoped lang="scss">
.guest-data-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.guest-data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .guest-count {
    font-size: 0.875rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 4px 10px;
    border-radius: 12px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-danger {
    background-color: #ef4444;
    color: white;
    border-color: #ef4444;

    &:hover:not(:disabled) {
      background-color: #dc2626;
    }
  }
}

.status-message {
  margin: 0 16px;
  padding: 10px 16px;
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

.filters-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.filter-stats {
  font-size: 0.875rem;
  color: #6b7280;
  flex: 1;
}

.btn-add-guest {
  padding: 6px 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #2563eb;
  }
}

.guest-table-container {
  flex: 1;
  overflow: hidden;
  padding: 0 16px 16px;
  background: #f3f4f6;
}

.linking-cursor-tooltip {
  position: fixed;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 99999;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: tooltip-appear 0.2s ease-out;

  .link-icon {
    font-size: 1rem;
  }

  .link-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #92400e;
    white-space: nowrap;
  }

  .link-hint {
    font-size: 0.75rem;
    color: #b45309;
    opacity: 0.8;
  }
}

@keyframes tooltip-appear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.group-linking-section {
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;

  h3 {
    margin: 0 0 8px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
}
</style>
