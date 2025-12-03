<template>
  <div class="config-room-list">
    <div class="config-header">
      <h3>Configure Dormitories & Rooms</h3>
      <button @click="addDormitory" class="btn-add-dorm">
        + Add Dormitory
      </button>
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
        @remove="removeDormitory(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
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

const dormitories = computed(() => dormitoryStore.dormitories)

function updateDormitory(index: number, updatedDormitory: Dormitory) {
  dormitoryStore.dormitories[index] = updatedDormitory
}

function removeDormitory(index: number) {
  if (confirm(`Remove dormitory "${dormitories.value[index].dormitoryName}"? This will also remove all its rooms and beds.`)) {
    dormitoryStore.dormitories.splice(index, 1)
  }
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
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
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
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
