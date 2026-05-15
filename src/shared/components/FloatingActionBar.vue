<template>
  <div
    class="floating-action-bar"
    :class="{ highlighted: highlightedElement === 'floating-action-bar' }"
    data-hint-target="floating-action-bar"
  >
    <div
      class="action-group"
      :class="{ highlighted: highlightedElement === 'undo-redo-btns' }"
      data-hint-target="undo-redo-btns"
    >
      <button
        class="action-btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
        title="Undo last action"
      >
        <span class="btn-icon">↩</span>
      </button>
      <button
        class="action-btn"
        :disabled="!canRedo"
        @click="$emit('redo')"
        title="Redo last undone action"
      >
        <span class="btn-icon">↪</span>
      </button>
    </div>

    <div class="action-group suggestions-group" v-if="hasSuggestions">
      <div class="action-divider"></div>
      <button
        class="action-btn btn-success"
        @click="$emit('accept-all')"
        title="Accept all suggested placements"
      >
        <span class="btn-icon">✓</span>
        <span class="btn-label">Accept All ({{ suggestionCount }})</span>
      </button>
      <button
        class="action-btn btn-secondary"
        @click="$emit('clear-suggestions')"
        title="Clear all suggestions"
      >
        <span class="btn-icon">✕</span>
      </button>
      <span
        v-if="unplaceableGroupCount > 0"
        class="unplaceable-warning"
        :title="unplaceableGroupDetails"
      >
        {{ unplaceableGroupCount }} unplaced
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useHints } from '@/features/hints/composables/useHints'

const emit = defineEmits<{
  undo: []
  redo: []
  'reset-assignments': []
  'accept-all': []
  'clear-suggestions': []
}>()

const assignmentStore = useAssignmentStore()
const { highlightedElement } = useHints()

const canUndo = computed(() => assignmentStore.canUndo)
const canRedo = computed(() => assignmentStore.canRedo)
const assignedCount = computed(() => assignmentStore.assignedCount)
const hasSuggestions = computed(() => assignmentStore.hasSuggestions)
const suggestionCount = computed(() => assignmentStore.suggestedAssignments.size)
const unplaceableGroupCount = computed(() => assignmentStore.unplaceableGroups.length)
const unplaceableGroupDetails = computed(() =>
  assignmentStore.unplaceableGroups
    .map(g => `${g.groupName} (${g.memberCount} members): ${g.reason}`)
    .join('\n')
)
</script>

<style scoped lang="scss">
.floating-action-bar {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &.highlighted {
    animation: hint-pulse 1.5s ease-in-out infinite;
    border-radius: 6px;
  }
}

@keyframes hint-pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 16px rgba(16, 185, 129, 0.25);
  }
}

.action-group {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;

  &.highlighted {
    animation: group-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
}

@keyframes group-pulse {
  0%, 100% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(16, 185, 129, 0.25);
  }
}

.suggestions-group {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.action-divider {
  width: 1px;
  height: 16px;
  background-color: #e5e7eb;
  margin: 0 2px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  height: 22px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 0.85rem;
  }
}

.btn-danger {
  border-color: #fca5a5;
  color: #dc2626;

  &:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #f87171;
  }
}

.btn-success {
  background: #10b981;
  border-color: #10b981;
  color: white;

  &:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }
}

.btn-secondary {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #6b7280;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
}

.unplaceable-warning {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  color: #92400e;
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: help;
  line-height: 1.2;
}
</style>
