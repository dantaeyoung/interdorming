<template>
  <Modal v-model="showModal" title="Custom Sort" @close="handleClose">
    <div class="sort-config-modal">
      <!-- Toolbar -->
      <div class="sort-toolbar">
        <button class="btn btn-add" @click="handleAddLevel">
          + Add Level
        </button>
        <button
          class="btn btn-delete"
          :disabled="sortLevels.length === 0"
          @click="handleDeleteSelected"
        >
          Delete Level
        </button>
        <div class="toolbar-spacer"></div>
        <button
          class="btn btn-move"
          :disabled="!canMoveUp"
          @click="handleMoveUp"
          title="Move up"
        >
          ▲
        </button>
        <button
          class="btn btn-move"
          :disabled="!canMoveDown"
          @click="handleMoveDown"
          title="Move down"
        >
          ▼
        </button>
      </div>

      <!-- Sort Levels Table -->
      <div class="sort-levels-container">
        <table class="sort-levels-table">
          <thead>
            <tr>
              <th class="col-select"></th>
              <th class="col-label">Level</th>
              <th class="col-column">Column</th>
              <th class="col-order">Order</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortLevels.length === 0" class="empty-row">
              <td colspan="4">
                <div class="empty-message">
                  No sort levels defined. Click "Add Level" to start.
                </div>
              </td>
            </tr>
            <tr
              v-for="(level, index) in sortLevels"
              :key="level.id"
              :class="{ selected: selectedLevelId === level.id }"
              @click="selectedLevelId = level.id"
            >
              <td class="col-select">
                <input
                  type="radio"
                  :checked="selectedLevelId === level.id"
                  @change="selectedLevelId = level.id"
                />
              </td>
              <td class="col-label">
                {{ index === 0 ? 'Sort by' : 'Then by' }}
              </td>
              <td class="col-column">
                <select
                  :value="level.field"
                  @change="handleFieldChange(level.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="option in fieldOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </td>
              <td class="col-order">
                <select
                  :value="level.direction"
                  @change="handleDirectionChange(level.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="asc">Ascending (A-Z, 0-9)</option>
                  <option value="desc">Descending (Z-A, 9-0)</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="sort-footer">
        <button class="btn btn-secondary" @click="handleClearAll">
          Clear All
        </button>
        <div class="footer-spacer"></div>
        <button class="btn btn-secondary" @click="handleClose">
          Cancel
        </button>
        <button class="btn btn-primary" @click="handleOk">
          OK
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from './Modal.vue'
import { useSortConfig, SORT_FIELD_OPTIONS, type SortLevel, type SortableField, type SortDirection } from '../composables/useSortConfig'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  close: []
  apply: []
}>()

// Create a computed that syncs with the show prop for v-model on Modal
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => {
    if (!value) {
      emit('close')
    }
  }
})

const { sortLevels, addLevel, removeLevel, updateLevel, moveLevelUp, moveLevelDown, clearAllLevels } = useSortConfig()

const selectedLevelId = ref<string | null>(null)
const fieldOptions = SORT_FIELD_OPTIONS

// Auto-select first level when modal opens
watch(() => props.show, (isShown) => {
  if (isShown && sortLevels.value.length > 0) {
    selectedLevelId.value = sortLevels.value[0].id
  }
})

// Computed for move button states
const selectedIndex = computed(() => {
  if (!selectedLevelId.value) return -1
  return sortLevels.value.findIndex(l => l.id === selectedLevelId.value)
})

const canMoveUp = computed(() => selectedIndex.value > 0)
const canMoveDown = computed(() => {
  return selectedIndex.value >= 0 && selectedIndex.value < sortLevels.value.length - 1
})

function handleAddLevel() {
  addLevel()
  // Select the newly added level
  if (sortLevels.value.length > 0) {
    selectedLevelId.value = sortLevels.value[sortLevels.value.length - 1].id
  }
}

function handleDeleteSelected() {
  if (selectedLevelId.value) {
    const index = selectedIndex.value
    removeLevel(selectedLevelId.value)

    // Select next level or previous if at end
    if (sortLevels.value.length > 0) {
      const newIndex = Math.min(index, sortLevels.value.length - 1)
      selectedLevelId.value = sortLevels.value[newIndex].id
    } else {
      selectedLevelId.value = null
    }
  }
}

function handleMoveUp() {
  if (selectedLevelId.value && canMoveUp.value) {
    moveLevelUp(selectedLevelId.value)
  }
}

function handleMoveDown() {
  if (selectedLevelId.value && canMoveDown.value) {
    moveLevelDown(selectedLevelId.value)
  }
}

function handleFieldChange(levelId: string, field: string) {
  updateLevel(levelId, { field: field as SortableField })
}

function handleDirectionChange(levelId: string, direction: string) {
  updateLevel(levelId, { direction: direction as SortDirection })
}

function handleClearAll() {
  clearAllLevels()
  selectedLevelId.value = null
}

function handleClose() {
  emit('close')
}

function handleOk() {
  emit('apply')
  emit('close')
}
</script>

<style scoped lang="scss">
.sort-config-modal {
  width: 550px;
  max-width: 90vw;
}

.sort-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-spacer {
  flex: 1;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;

  &:hover:not(:disabled) {
    background-color: #f3f4f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-add {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;

    &:hover {
      background-color: #2563eb;
    }
  }

  &.btn-delete {
    color: #dc2626;
    border-color: #fca5a5;

    &:hover:not(:disabled) {
      background-color: #fef2f2;
    }
  }

  &.btn-move {
    padding: 6px 10px;
    font-size: 0.7rem;
  }

  &.btn-primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;

    &:hover {
      background-color: #2563eb;
    }
  }

  &.btn-secondary {
    background: white;
    color: #374151;
    border-color: #d1d5db;

    &:hover {
      background-color: #f3f4f6;
    }
  }
}

.sort-levels-container {
  max-height: 300px;
  overflow-y: auto;
  border-bottom: 1px solid #e5e7eb;
}

.sort-levels-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    position: sticky;
    top: 0;
    background: #f3f4f6;
    z-index: 1;

    th {
      padding: 8px 12px;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb;
    }
  }

  tbody {
    tr {
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover {
        background-color: #f9fafb;
      }

      &.selected {
        background-color: #dbeafe;

        &:hover {
          background-color: #bfdbfe;
        }
      }

      &.empty-row {
        cursor: default;

        &:hover {
          background-color: transparent;
        }
      }
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #374151;
    }
  }

  .col-select {
    width: 40px;
    text-align: center;

    input[type="radio"] {
      cursor: pointer;
    }
  }

  .col-label {
    width: 80px;
    font-weight: 500;
    color: #6b7280;
  }

  .col-column,
  .col-order {
    select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.8rem;
      background: white;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
    }
  }

  .empty-message {
    text-align: center;
    color: #9ca3af;
    font-style: italic;
    padding: 20px;
  }
}

.sort-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f9fafb;
}

.footer-spacer {
  flex: 1;
}
</style>
