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
    </div>

    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <TransitionGroup v-else name="dorm-reorder" tag="div" class="dormitories-list">
      <DormitoryConfigSection
        v-for="(dormitory, index) in dormitories"
        :key="dormitory.dormitoryName"
        :dormitory="dormitory"
        :is-first="index === 0"
        :is-last="index === dormitories.length - 1"
        @update="(updated) => updateDormitory(index, updated)"
        @remove="handleRemoveDormitory(index)"
        @move-up="moveDormitory(index, index - 1)"
        @move-down="moveDormitory(index, index + 1)"
      />
    </TransitionGroup>
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

function moveDormitory(from: number, to: number) {
  if (to < 0 || to >= dormitoryStore.dormitories.length) return
  const arr = dormitoryStore.dormitories
  const item = arr.splice(from, 1)[0]
  arr.splice(to, 0, item)
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

.dorm-reorder-move {
  transition: transform 0.35s ease;
}
</style>
