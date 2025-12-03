<template>
  <div class="room-card">
    <div class="room-header">
      <div class="room-title">
        <h4>{{ room.roomName }}</h4>
        <span :class="['badge', `badge-gender-${room.roomGender.toLowerCase()}`]">
          {{ room.roomGender }}
        </span>
      </div>
      <div class="room-actions">
        <button
          v-if="hasAvailableBeds"
          @click="handleAutoPlaceRoom"
          class="auto-place-btn"
          title="Auto-place guests in this room only"
        >
          Auto-fill
        </button>
        <div class="room-info">
          {{ occupiedCount }}/{{ room.beds.length }} beds
          <span v-if="ageRange" class="age-range">{{ ageRange }}</span>
        </div>
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
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useAutoPlacement } from '@/features/assignments/composables/useAutoPlacement'
import BedSlot from './BedSlot.vue'
import type { Room } from '@/types'

interface Props {
  room: Room
}

const props = defineProps<Props>()

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const { autoPlaceGuestsInRoom } = useAutoPlacement()

const occupiedCount = computed(() => {
  return props.room.beds.filter(bed => bed.assignedGuestId).length
})

const hasAvailableBeds = computed(() => {
  return props.room.beds.some(bed => !bed.assignedGuestId && bed.active !== false)
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

function handleAutoPlaceRoom() {
  const suggestions = autoPlaceGuestsInRoom(props.room)

  // Add suggestions to the assignment store
  suggestions.forEach((bedId, guestId) => {
    assignmentStore.suggestedAssignments.set(guestId, bedId)
  })
}
</script>

<style scoped lang="scss">
.room-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.room-header {
  padding: 8px 10px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-title {
  display: flex;
  align-items: center;
  gap: 8px;

  h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
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

.room-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-place-btn {
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #3b82f6;
  background: white;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #3b82f6;
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }
}

.room-info {
  font-size: 0.8rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.age-range {
  font-size: 0.7rem;
  color: #9ca3af;
}

.beds-grid {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 0px;
}
</style>
