<template>
  <div class="assignment-toolbar">
    <div class="toolbar-section">
      <button
        class="btn btn-primary"
        :disabled="!hasGuests || autoPlaceDisabled"
        @click="$emit('auto-place')"
      >
        Auto Place
      </button>
      <button
        v-if="hasSuggestions"
        class="btn"
        @click="$emit('accept-all')"
      >
        Accept All
      </button>
      <button
        v-if="hasSuggestions"
        class="btn"
        @click="$emit('clear-suggestions')"
      >
        Clear Suggestions
      </button>
    </div>

    <div class="toolbar-section">
      <button
        class="btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
      >
        Undo
      </button>
      <button
        class="btn"
        :disabled="!hasGuests"
        @click="$emit('export')"
      >
        Export CSV
      </button>
      <button
        class="btn"
        :disabled="!hasAssignments"
        @click="$emit('reset-assignments')"
      >
        Reset All Assignments
      </button>
      <button
        class="btn btn-danger"
        :disabled="!hasGuests"
        @click="$emit('delete-all')"
      >
        Delete All People Data
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'

interface Props {
  autoPlaceDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  autoPlaceDisabled: false,
})

defineEmits<{
  'auto-place': []
  'accept-all': []
  'clear-suggestions': []
  'undo': []
  'export': []
  'reset-assignments': []
  'delete-all': []
}>()

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()

const hasGuests = computed(() => guestStore.guests.length > 0)
const hasAssignments = computed(() => assignmentStore.assignedCount > 0)
const hasSuggestions = computed(() => assignmentStore.hasSuggestions)
const canUndo = computed(() => assignmentStore.canUndo)
</script>

<style scoped lang="scss">
.assignment-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  gap: 10px;
  align-items: center;
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

  &.btn-primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;

    &:hover:not(:disabled) {
      background-color: #2563eb;
    }
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
</style>
