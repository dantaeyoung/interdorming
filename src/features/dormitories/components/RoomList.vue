<template>
  <div class="room-list">
    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else ref="containerRef" class="dormitories-container">
      <RoomGroupLinesOverlay v-if="isMounted && containerRef" :containerRef="containerRef" />
      <DormitorySection
        v-for="dormitory in activeDormitories"
        :key="dormitory.dormitoryName"
        :dormitory="dormitory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import DormitorySection from './DormitorySection.vue'
import RoomGroupLinesOverlay from './RoomGroupLinesOverlay.vue'

interface Props {
  emptyTitle?: string
  emptyMessage?: string
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: 'No rooms configured',
  emptyMessage: 'Room layout will appear here once configured.',
  searchQuery: '',
})

const containerRef = ref<HTMLElement | null>(null)
const isMounted = ref(false)
const dormitoryStore = useDormitoryStore()
const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()

const dormitories = computed(() => dormitoryStore.dormitories)

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const activeDormitories = computed(() => {
  const active = dormitories.value.filter(d => d.active)
  if (!props.searchQuery.trim()) return active

  const query = normalizeText(props.searchQuery)

  // Filter dormitories to only include rooms with matching guests or room names
  return active.map(dorm => {
    const matchingRooms = dorm.rooms.filter(room => {
      if (!room.active) return false
      // Match room name
      if (normalizeText(room.roomName).includes(query)) return true
      if (normalizeText(dorm.dormitoryName).includes(query)) return true
      // Match any assigned guest in this room
      return room.beds.some(bed => {
        if (bed.active === false) return false
        const guestId = assignmentStore.getGuestsAssignedToBed(bed.bedId)[0]
        if (!guestId) return false
        const guest = guestStore.getGuestById(guestId)
        if (!guest) return false
        return normalizeText(guest.firstName).includes(query) ||
          normalizeText(guest.lastName).includes(query) ||
          (guest.preferredName && normalizeText(guest.preferredName).includes(query)) ||
          (guest.groupName && normalizeText(guest.groupName).includes(query))
      })
    })
    if (matchingRooms.length === 0) return null
    return { ...dorm, rooms: matchingRooms }
  }).filter(Boolean) as typeof active
})

onMounted(() => {
  isMounted.value = true
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
