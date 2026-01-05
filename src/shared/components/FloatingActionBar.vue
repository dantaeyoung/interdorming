<template>
  <Teleport to="body">
    <div class="floating-action-bar">
      <div class="action-group">
        <button
          class="action-btn"
          :disabled="!canUndo"
          @click="$emit('undo')"
          title="Undo last action"
        >
          <span class="btn-icon">↩</span>
          <span class="btn-label">Undo</span>
        </button>
        <button
          class="action-btn"
          :disabled="!canRedo"
          @click="$emit('redo')"
          title="Redo last undone action"
        >
          <span class="btn-icon">↪</span>
          <span class="btn-label">Redo</span>
        </button>
      </div>

      <div class="action-divider"></div>

      <div class="action-group">
        <button
          class="action-btn btn-danger"
          :disabled="assignedCount === 0"
          @click="$emit('reset-assignments')"
          title="Reset all assignments"
        >
          <span class="btn-icon">🗑</span>
          <span class="btn-label">Reset All</span>
        </button>
      </div>

      <div class="action-divider"></div>

      <div class="action-group suggestions-group" v-if="hasSuggestions">
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
          <span class="btn-label">Clear</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignmentStore'

const emit = defineEmits<{
  undo: []
  redo: []
  'reset-assignments': []
  'accept-all': []
  'clear-suggestions': []
}>()

const assignmentStore = useAssignmentStore()

const canUndo = computed(() => assignmentStore.canUndo)
const canRedo = computed(() => assignmentStore.canRedo)
const assignedCount = computed(() => assignmentStore.assignedCount)
const hasSuggestions = computed(() => assignmentStore.hasSuggestions)
const suggestionCount = computed(() => assignmentStore.suggestedAssignments.size)
</script>

<style scoped lang="scss">
.floating-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.action-group {
  display: flex;
  align-items: center;
  gap: 6px;
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
  height: 24px;
  background-color: #e5e7eb;
  margin: 0 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1rem;
  }

  .btn-label {
    @media (max-width: 768px) {
      display: none;
    }
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
</style>
