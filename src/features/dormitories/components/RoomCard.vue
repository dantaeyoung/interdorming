<template>
  <div class="room-card">
    <div class="room-header">
      <div class="room-title">
        <h4>{{ room.roomName }}</h4>
        <span :class="['badge', `badge-gender-${room.roomGender.toLowerCase()}`]">
          {{ room.roomGender }}
        </span>
      </div>
      <div class="room-info">
        {{ occupiedCount }}/{{ room.beds.length }} beds
        <span v-if="ageRange" class="age-range">{{ ageRange }}</span>
      </div>
    </div>

    <div class="beds-grid">
      <BedSlot v-for="bed in room.beds" :key="bed.bedId" :bed="bed" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import BedSlot from './BedSlot.vue'
import type { Room } from '@/types'

interface Props {
  room: Room
}

const props = defineProps<Props>()

const guestStore = useGuestStore()

const occupiedCount = computed(() => {
  return props.room.beds.filter(bed => bed.assignedGuestId).length
})

const assignedGuests = computed(() => {
  return props.room.beds
    .filter(bed => bed.assignedGuestId)
    .map(bed => guestStore.getGuestById(bed.assignedGuestId!))
    .filter(guest => guest !== undefined)
})

const ageRange = computed(() => {
  const guests = assignedGuests.value
  if (guests.length === 0) return null

  const ages = guests.map(g => {
    const age = typeof g.age === 'number' ? g.age : parseInt(String(g.age))
    return isNaN(age) ? 0 : age
  })

  const minAge = Math.min(...ages)
  const maxAge = Math.max(...ages)

  if (minAge === 0 && maxAge === 0) return null
  if (minAge === maxAge) return `age ${minAge}`
  return `ages ${minAge}-${maxAge}`
})
</script>

<style scoped lang="scss">
.room-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.room-header {
  padding: 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-title {
  display: flex;
  align-items: center;
  gap: 12px;

  h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;

  &.badge-gender-m {
    background-color: #dbeafe;
    color: #1e40af;
  }

  &.badge-gender-f {
    background-color: #fce7f3;
    color: #9f1239;
  }

  &.badge-gender-coed {
    background-color: #f3e8ff;
    color: #6b21a8;
  }
}

.room-info {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.age-range {
  font-size: 0.75rem;
  color: #9ca3af;
}

.beds-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
</style>
