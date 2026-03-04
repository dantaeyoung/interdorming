<template>
  <div class="layout-selector">
    <div class="layout-bar">
      <div class="layout-bar-left">
        <label class="layout-label">Layout:</label>
        <select
          class="layout-select"
          :value="dormitoryStore.activeLayoutId"
          @change="handleLayoutChange"
        >
          <option
            v-for="layout in dormitoryStore.layouts"
            :key="layout.id"
            :value="layout.id"
          >
            {{ layout.name }}
          </option>
        </select>
        <button class="btn-layout btn-new" @click="showNewModal = true">+ New</button>
        <button
          class="btn-layout btn-delete"
          :disabled="dormitoryStore.layouts.length <= 1"
          @click="handleDeleteClick"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="layout-details">
      <div class="detail-row">
        <label class="detail-label">Name:</label>
        <input
          class="detail-input"
          :value="activeLayout?.name || ''"
          @input="handleNameChange"
          placeholder="Layout name"
        />
      </div>
      <div class="detail-row">
        <label class="detail-label">Description:</label>
        <input
          class="detail-input"
          :value="activeLayout?.description || ''"
          @input="handleDescriptionChange"
          placeholder="Optional description"
        />
      </div>
    </div>

    <!-- New Layout Modal -->
    <NewLayoutModal
      v-model="showNewModal"
      :layouts="dormitoryStore.layouts"
      @create="handleCreate"
    />

    <!-- Confirm Switch Dialog -->
    <ConfirmDialog
      v-model="showSwitchConfirm"
      title="Switch Layout"
      message="Switching layouts will clear all current guest assignments. Continue?"
      confirm-text="Switch"
      variant="warning"
      @confirm="confirmSwitch"
      @cancel="cancelSwitch"
    />

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Layout"
      :message="`Delete layout '${activeLayout?.name}'? This cannot be undone.`"
      confirm-text="Delete"
      variant="danger"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { ConfirmDialog } from '@/shared/components'
import NewLayoutModal from './NewLayoutModal.vue'

const emit = defineEmits<{
  'status': [message: string, type: 'success' | 'error' | 'info']
}>()

const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()

const showNewModal = ref(false)
const showSwitchConfirm = ref(false)
const showDeleteConfirm = ref(false)
const pendingSwitchId = ref<string | null>(null)

const activeLayout = computed(() => dormitoryStore.activeLayout)

function handleLayoutChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newId = target.value

  if (newId === dormitoryStore.activeLayoutId) return

  // If there are assignments, confirm before switching
  if (assignmentStore.assignments.size > 0) {
    pendingSwitchId.value = newId
    showSwitchConfirm.value = true
  } else {
    doSwitch(newId)
  }
}

function confirmSwitch() {
  if (pendingSwitchId.value) {
    doSwitch(pendingSwitchId.value)
    pendingSwitchId.value = null
  }
  showSwitchConfirm.value = false
}

function cancelSwitch() {
  pendingSwitchId.value = null
  showSwitchConfirm.value = false
}

function doSwitch(layoutId: string) {
  const target = dormitoryStore.layouts.find(l => l.id === layoutId)
  if (!target) return

  dormitoryStore.switchLayout(layoutId)
  assignmentStore.clearAllAssignments()
  emit('status', `Switched to ${target.name}`, 'success')
}

function handleCreate(name: string, description: string, cloneFromId?: string) {
  // Clear assignments when creating new layout
  assignmentStore.clearAllAssignments()
  dormitoryStore.createLayout(name, description, cloneFromId)
  emit('status', `Created layout "${name}"`, 'success')
}

function handleDeleteClick() {
  showDeleteConfirm.value = true
}

function confirmDelete() {
  const name = activeLayout.value?.name
  const id = dormitoryStore.activeLayoutId
  if (!id) return

  dormitoryStore.deleteLayout(id)
  assignmentStore.clearAllAssignments()
  showDeleteConfirm.value = false
  emit('status', `Deleted layout "${name}"`, 'success')
}

function handleNameChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (activeLayout.value) {
    activeLayout.value.name = value
    dormitoryStore.configName = value
  }
}

function handleDescriptionChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (activeLayout.value) {
    activeLayout.value.description = value
  }
}
</script>

<style scoped lang="scss">
.layout-selector {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 10px 16px;
}

.layout-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.layout-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.layout-select {
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.825rem;
  color: #374151;
  background: white;
  min-width: 180px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }
}

.btn-layout {
  padding: 5px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #374151;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.btn-new {
  color: #3b82f6;
  border-color: #93c5fd;

  &:hover {
    background: #eff6ff;
    border-color: #3b82f6;
  }
}

.btn-delete {
  color: #ef4444;
  border-color: #fca5a5;

  &:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #ef4444;
  }
}

.layout-details {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.detail-label {
  font-size: 0.775rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}

.detail-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #374151;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }

  &::placeholder {
    color: #9ca3af;
  }
}
</style>
