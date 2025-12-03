<template>
  <div class="room-list">
    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else class="dormitories-container">
      <DormitorySection
        v-for="dormitory in activeDormitories"
        :key="dormitory.dormitoryName"
        :dormitory="dormitory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import DormitorySection from './DormitorySection.vue'

interface Props {
  emptyTitle?: string
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  emptyTitle: 'No rooms configured',
  emptyMessage: 'Room layout will appear here once configured.',
})

const dormitoryStore = useDormitoryStore()

const dormitories = computed(() => dormitoryStore.dormitories)

const activeDormitories = computed(() => {
  return dormitories.value.filter(d => d.active)
})
</script>

<style scoped lang="scss">
.room-list {
  width: 100%;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
  background: white;
  border-radius: 8px;
  border: 1px dashed #d1d5db;

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

.dormitories-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
