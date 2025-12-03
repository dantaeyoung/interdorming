<template>
  <div class="auto-placement-settings">
    <h3>Placement Priorities</h3>
    <p class="description">
      Drag to reorder priorities. Higher priorities have more weight in placement decisions.
    </p>

    <div class="priorities-list">
      <div
        v-for="(priority, index) in localPriorities"
        :key="priority.name"
        class="priority-item"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event, index)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
        :class="{ dragging: draggedIndex === index }"
      >
        <div class="drag-handle">
          <span>::</span>
        </div>
        <div class="priority-info">
          <span class="priority-label">{{ priority.label }}</span>
          <span class="priority-weight">Weight: {{ priority.weight }}</span>
        </div>
        <label class="toggle-checkbox">
          <input
            type="checkbox"
            :checked="priority.enabled"
            @change="togglePriority(index)"
          />
          <span class="checkmark" :class="{ checked: priority.enabled }"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <label class="setting-row">
        <span>Allow constraint relaxation</span>
        <input
          type="checkbox"
          :checked="settingsStore.settings.autoPlacement.allowConstraintRelaxation"
          @change="toggleConstraintRelaxation"
        />
      </label>
      <p class="help-text">
        When enabled, uses 3-pass algorithm to place more guests by relaxing bunk and age
        preferences
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AutoPlacementPriority } from '@/types'

const settingsStore = useSettingsStore()

const localPriorities = ref<AutoPlacementPriority[]>([])
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

onMounted(() => {
  // Clone the priorities array to work with locally
  localPriorities.value = JSON.parse(
    JSON.stringify(settingsStore.settings.autoPlacement.priorities)
  )
})

function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', String(index))
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  dragOverIndex.value = index
}

function handleDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault()

  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    return
  }

  const newPriorities = [...localPriorities.value]
  const draggedItem = newPriorities[draggedIndex.value]

  // Remove from old position
  newPriorities.splice(draggedIndex.value, 1)

  // Insert at new position
  newPriorities.splice(dropIndex, 0, draggedItem)

  // Recalculate weights in descending order
  // Start with highest weight and decrease by 1 for each subsequent priority
  const maxWeight = 10
  newPriorities.forEach((priority, index) => {
    priority.weight = maxWeight - index
  })

  localPriorities.value = newPriorities

  // Update store
  settingsStore.settings.autoPlacement.priorities = newPriorities
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

function togglePriority(index: number) {
  const newEnabled = !localPriorities.value[index].enabled
  localPriorities.value[index].enabled = newEnabled

  // Update the entire priorities array in the store
  settingsStore.settings.autoPlacement.priorities = [...localPriorities.value]
}

function toggleConstraintRelaxation() {
  const newValue = !settingsStore.settings.autoPlacement.allowConstraintRelaxation
  settingsStore.updateConstraintRelaxation(newValue)
}
</script>

<style scoped lang="scss">
.auto-placement-settings {
  padding: 24px;
  max-width: 800px;

  h3 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .description {
    margin: 0 0 24px 0;
    color: #6b7280;
    font-size: 0.95rem;
  }
}

.priorities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.priority-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: move;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.dragging {
    opacity: 0.5;
    border-color: #3b82f6;
  }
}

.drag-handle {
  display: flex;
  align-items: center;
  color: #9ca3af;
  font-size: 1.2rem;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  span {
    line-height: 1;
  }
}

.priority-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.priority-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.priority-weight {
  font-size: 0.95rem;
  color: #6b7280;
}

.toggle-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;

  input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .checkmark {
    width: 24px;
    height: 24px;
    border: 2px solid #d1d5db;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &.checked {
      background-color: #3b82f6;
      border-color: #3b82f6;

      &::after {
        content: '✓';
        color: white;
        font-weight: bold;
        font-size: 16px;
      }
    }
  }

  &:hover .checkmark {
    border-color: #3b82f6;
  }
}

.settings-section {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 24px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  color: #1f2937;
  cursor: pointer;

  span {
    font-weight: 500;
  }

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
}

.help-text {
  margin: 8px 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
