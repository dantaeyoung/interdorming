<template>
  <div class="config-room-list">
    <div class="config-header">
      <div class="config-title-row">
        <h3>Configure Dormitories & Rooms</h3>
        <button
          @click="addDormitory"
          class="btn-add-dorm"
          :class="{ highlighted: highlightedElement === 'add-dormitory' }"
        >
          + Add Dormitory
        </button>
      </div>
      <div class="config-name-row">
        <label class="config-name-label">Config Name:</label>
        <input
          v-model="dormitoryStore.configName"
          class="config-name-input"
          placeholder="e.g., Spring Retreat 2026"
        />
      </div>
    </div>

    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else class="dormitories-list">
      <DormitoryConfigSection
        v-for="(dormitory, index) in dormitories"
        :key="dormitory.dormitoryName"
        :dormitory="dormitory"
        @update="(updated) => updateDormitory(index, updated)"
        @remove="handleRemoveDormitory(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useHints } from '@/features/hints/composables/useHints'
import DormitoryConfigSection from './DormitoryConfigSection.vue'
import type { Dormitory } from '@/types'

interface Props {
  emptyTitle?: string
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  emptyTitle: 'No dormitories configured',
  emptyMessage: 'Add a dormitory to begin configuring rooms and beds.',
})

const dormitoryStore = useDormitoryStore()
const { highlightedElement } = useHints()

const dormitories = computed(() => dormitoryStore.dormitories)

function updateDormitory(index: number, updatedDormitory: Dormitory) {
  dormitoryStore.dormitories[index] = updatedDormitory
}

// DormitoryConfigSection handles the confirmation dialog and guest unassignment
// This is called after user confirms the removal
function handleRemoveDormitory(index: number) {
  dormitoryStore.dormitories.splice(index, 1)
}

function addDormitory() {
  const newDormNumber = dormitories.value.length + 1
  const newDormitory: Dormitory = {
    dormitoryName: `Dormitory ${newDormNumber}`,
    active: true,
    color: '#4299e1',
    rooms: []
  }
  dormitoryStore.dormitories.push(newDormitory)
}
</script>

<style scoped lang="scss">
.config-room-list {
  padding: 16px;
}

.config-header {
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.config-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.config-name-label {
  font-size: 0.825rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}

.config-name-input {
  flex: 1;
  max-width: 350px;
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.825rem;
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

.btn-add-dorm {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
  }

  &.highlighted {
    background: #10b981;
    animation: btn-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);

    &:hover {
      background: #059669;
    }
  }
}

@keyframes btn-pulse {
  0%, 100% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(16, 185, 129, 0.25);
  }
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;

  h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.dormitories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
