<template>
  <div class="backup-controls">
    <button @click="handleExport" :disabled="isExporting" class="btn btn-export">
      <span v-if="isExporting">Exporting...</span>
      <span v-else>Export Backup</span>
    </button>

    <button @click="handleImport" :disabled="isImporting" class="btn btn-import">
      <span v-if="isImporting">Importing...</span>
      <span v-else>Import Backup</span>
    </button>

    <!-- Import Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="cancelImport">
      <div class="modal">
        <h3>Import Backup</h3>

        <div v-if="validationResult">
          <!-- Validation Errors -->
          <div v-if="validationResult.errors.length > 0" class="validation-errors">
            <h4>Errors</h4>
            <ul>
              <li v-for="(error, index) in validationResult.errors" :key="index">{{ error }}</li>
            </ul>
          </div>

          <!-- Validation Warnings -->
          <div v-if="validationResult.warnings.length > 0" class="validation-warnings">
            <h4>Warnings</h4>
            <ul>
              <li v-for="(warning, index) in validationResult.warnings" :key="index">{{ warning }}</li>
            </ul>
          </div>

          <!-- Summary -->
          <div v-if="validationResult.isValid" class="validation-summary">
            <h4>Backup Contents</h4>
            <ul>
              <li><strong>Guests:</strong> {{ validationResult.summary.guestCount }}</li>
              <li><strong>Dormitories:</strong> {{ validationResult.summary.dormitoryCount }}</li>
              <li><strong>Rooms:</strong> {{ validationResult.summary.roomCount }}</li>
              <li><strong>Beds:</strong> {{ validationResult.summary.bedCount }}</li>
              <li><strong>Assignments:</strong> {{ validationResult.summary.assignmentCount }}</li>
            </ul>

            <p class="warning-text">
              This will replace ALL current data. This action cannot be undone.
            </p>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="cancelImport" class="btn btn-secondary">Cancel</button>
          <button
            v-if="validationResult?.isValid"
            @click="confirmImport"
            class="btn btn-danger"
            :disabled="isImporting"
          >
            {{ isImporting ? 'Importing...' : 'Replace All Data' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Toast -->
    <div v-if="toastMessage" :class="['toast', toastType]">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDataBackup, type ImportValidationResult } from '../composables/useDataBackup'

const {
  isExporting,
  isImporting,
  exportBackup,
  importBackup,
  selectBackupFile,
  validateBackup,
} = useDataBackup()

const showConfirmModal = ref(false)
const validationResult = ref<ImportValidationResult | null>(null)
const pendingFile = ref<File | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function showToast(message: string, type: 'success' | 'error') {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

function handleExport() {
  try {
    exportBackup()
    showToast('Backup exported successfully', 'success')
  } catch (error) {
    showToast('Failed to export backup', 'error')
  }
}

async function handleImport() {
  const file = await selectBackupFile()
  if (!file) return

  try {
    // Read and validate the file
    const text = await file.text()
    const data = JSON.parse(text)
    validationResult.value = validateBackup(data)
    pendingFile.value = file
    showConfirmModal.value = true
  } catch (error) {
    showToast('Invalid backup file: could not parse JSON', 'error')
  }
}

function cancelImport() {
  showConfirmModal.value = false
  validationResult.value = null
  pendingFile.value = null
}

async function confirmImport() {
  if (!pendingFile.value) return

  const result = await importBackup(pendingFile.value)

  showConfirmModal.value = false
  pendingFile.value = null
  validationResult.value = null

  if (result.isValid) {
    showToast(
      `Imported ${result.summary.guestCount} guests, ${result.summary.dormitoryCount} dormitories`,
      'success'
    )
  } else {
    showToast('Import failed: ' + result.errors.join(', '), 'error')
  }
}
</script>

<style scoped lang="scss">
.backup-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-export {
  background-color: #10b981;
  color: white;
  border-color: #10b981;

  &:hover:not(:disabled) {
    background-color: #059669;
    border-color: #059669;
  }
}

.btn-import {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;

  &:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;

  &:hover:not(:disabled) {
    background-color: #e5e7eb;
  }
}

.btn-danger {
  background-color: #ef4444;
  color: white;
  border-color: #ef4444;

  &:hover:not(:disabled) {
    background-color: #dc2626;
    border-color: #dc2626;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
  }

  h4 {
    margin: 0 0 8px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  ul {
    margin: 0 0 16px 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
      font-size: 0.875rem;
      color: #4b5563;
    }
  }
}

.validation-errors {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;

  h4 {
    color: #dc2626;
  }

  li {
    color: #b91c1c;
  }
}

.validation-warnings {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;

  h4 {
    color: #d97706;
  }

  li {
    color: #b45309;
  }
}

.validation-summary {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;

  h4 {
    color: #16a34a;
  }

  .warning-text {
    margin: 12px 0 0 0;
    padding: 8px;
    background-color: #fef3c7;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #92400e;
    font-weight: 500;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1001;
  animation: slideIn 0.3s ease-out;

  &.success {
    background-color: #10b981;
    color: white;
  }

  &.error {
    background-color: #ef4444;
    color: white;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
