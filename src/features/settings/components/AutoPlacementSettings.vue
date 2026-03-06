<template>
  <div class="auto-placement-settings">
    <h3>Group Placement Order</h3>
    <p class="description">
      Groups are placed as whole units before individual guests.
      Drag to change which group types get placed first.
    </p>

    <div class="tier-list">
      <div
        v-for="(tierType, index) in localTierOrder"
        :key="tierType"
        class="tier-item"
        draggable="true"
        @dragstart="handleTierDragStart($event, index)"
        @dragover.prevent="handleTierDragOver($event, index)"
        @drop="handleTierDrop($event, index)"
        @dragend="handleTierDragEnd"
        :class="{ dragging: tierDraggedIndex === index }"
      >
        <div class="drag-handle">
          <span>::</span>
        </div>
        <span class="tier-rank">{{ index + 1 }}</span>
        <span class="tier-label">{{ tierLabels[tierType] }}</span>
      </div>
      <div class="tier-item tier-fixed">
        <div class="drag-handle invisible">
          <span>::</span>
        </div>
        <span class="tier-rank">5</span>
        <span class="tier-label tier-label-muted">Individual guests (always last)</span>
      </div>
    </div>

    <div class="settings-section couple-section">
      <label class="setting-row">
        <span>Split mixed-gender couples into gendered dorms</span>
        <input
          type="checkbox"
          :checked="settingsStore.settings.autoPlacement.couples.splitMixedGenderCouples"
          @change="toggleSplitCouples"
        />
      </label>
      <p class="help-text">
        When enabled, a mixed-gender pair of 2 adults is placed individually
        (he in a men's dorm, she in a women's dorm) instead of together in a coed room.
      </p>

      <div
        class="age-threshold"
        v-if="settingsStore.settings.autoPlacement.couples.splitMixedGenderCouples"
      >
        <label class="threshold-label">
          Keep together if either member is
          <strong>{{ settingsStore.settings.autoPlacement.couples.keepTogetherAge }}+</strong>
        </label>
        <input
          type="range"
          min="50"
          max="85"
          step="5"
          :value="settingsStore.settings.autoPlacement.couples.keepTogetherAge"
          @input="updateKeepTogetherAge"
        />
        <div class="range-labels">
          <span>50</span>
          <span>85</span>
        </div>
        <p class="help-text">
          Elderly couples or those with lower-bunk needs are always kept together.
        </p>
      </div>
    </div>

    <h3>Room Scoring Weights</h3>
    <p class="description">
      When choosing which room to place a group or guest in, these weights determine
      how important each factor is. Drag to reorder.
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
import type { AutoPlacementPriority, GroupType } from '@/types'
import { GROUP_TYPE_LABELS } from '@/types'

const settingsStore = useSettingsStore()

// --- Group Placement Order ---
const tierLabels = GROUP_TYPE_LABELS
const localTierOrder = ref<GroupType[]>([])
const tierDraggedIndex = ref<number | null>(null)

onMounted(() => {
  localTierOrder.value = [...settingsStore.settings.autoPlacement.groupPlacementOrder]
  localPriorities.value = JSON.parse(
    JSON.stringify(settingsStore.settings.autoPlacement.priorities)
  )
})

function handleTierDragStart(event: DragEvent, index: number) {
  tierDraggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', String(index))
  }
}

function handleTierDragOver(_event: DragEvent, _index: number) {
  // dragover handled by .prevent modifier
}

function handleTierDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault()
  if (tierDraggedIndex.value === null || tierDraggedIndex.value === dropIndex) return

  const newOrder = [...localTierOrder.value]
  const draggedItem = newOrder[tierDraggedIndex.value]
  newOrder.splice(tierDraggedIndex.value, 1)
  newOrder.splice(dropIndex, 0, draggedItem)

  localTierOrder.value = newOrder
  settingsStore.updateGroupPlacementOrder(newOrder)
}

function handleTierDragEnd() {
  tierDraggedIndex.value = null
}

// --- Room Scoring Weights (existing) ---
const localPriorities = ref<AutoPlacementPriority[]>([])
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

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

function toggleSplitCouples() {
  settingsStore.settings.autoPlacement.couples.splitMixedGenderCouples =
    !settingsStore.settings.autoPlacement.couples.splitMixedGenderCouples
}

function updateKeepTogetherAge(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  settingsStore.settings.autoPlacement.couples.keepTogetherAge = value
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

    &:not(:first-child) {
      margin-top: 36px;
    }
  }

  .description {
    margin: 0 0 24px 0;
    color: #6b7280;
    font-size: 0.95rem;
  }
}

// --- Group Placement Order ---
.tier-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.tier-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
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

  &.tier-fixed {
    cursor: default;
    background: #f9fafb;
    border-style: dashed;

    &:hover {
      border-color: #e5e7eb;
      box-shadow: none;
    }
  }
}

.tier-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;

  .tier-fixed & {
    background: #9ca3af;
  }
}

.tier-label {
  font-size: 1rem;
  font-weight: 500;
  color: #1f2937;

  &.tier-label-muted {
    color: #9ca3af;
    font-style: italic;
  }
}

// --- Room Scoring Weights ---
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

  &.invisible {
    visibility: hidden;
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

.couple-section {
  margin-top: 8px;
  margin-bottom: 8px;
}

.age-threshold {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;

  input[type='range'] {
    width: 100%;
    margin: 8px 0 4px;
    accent-color: #3b82f6;
  }
}

.threshold-label {
  font-size: 0.95rem;
  color: #374151;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #9ca3af;
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
