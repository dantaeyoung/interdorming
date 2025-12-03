<template>
  <div class="dormitory-section" :style="{ borderLeftColor: dormitory.color }">
    <div class="dormitory-header">
      <h3>{{ dormitory.dormitoryName }}</h3>
      <span class="room-count">{{ dormitory.rooms.length }} rooms</span>
    </div>
    <div class="rooms-container">
      <RoomCard v-for="room in activeRooms" :key="room.roomName" :room="room" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RoomCard from './RoomCard.vue'
import type { Dormitory } from '@/types'

interface Props {
  dormitory: Dormitory
}

const props = defineProps<Props>()

const activeRooms = computed(() => {
  return props.dormitory.rooms.filter(room => room.active)
})
</script>

<style scoped lang="scss">
.dormitory-section {
  border: 1px solid #e5e7eb;
  border-left: 4px solid #4299e1;
  border-radius: 8px;
  padding: 12px;
  background: white;
  margin-bottom: 16px;
}

.dormitory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.room-count {
  font-size: 0.75rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 3px 10px;
  border-radius: 10px;
}

.rooms-container {
  display: grid;
  gap: 10px;
}
</style>
