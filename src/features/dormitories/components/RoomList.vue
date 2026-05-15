<template>
  <div class="room-list">
    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else ref="containerRef" class="rooms-container">
      <RoomGroupLinesOverlay v-if="isMounted && containerRef" :containerRef="containerRef" />
      <RoomCard
        v-for="entry in flatRooms"
        :key="`${entry.dormName}::${entry.room.roomName}`"
        :room="entry.room"
        :view-date="viewDate"
        :dorm-color="entry.dormColor"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import RoomCard from './RoomCard.vue'
import RoomGroupLinesOverlay from './RoomGroupLinesOverlay.vue'
import type { Room } from '@/types'

interface Props {
  emptyTitle?: string
  emptyMessage?: string
  searchQuery?: string
  viewDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: 'No rooms configured',
  emptyMessage: 'Room layout will appear here once configured.',
  searchQuery: '',
  viewDate: null,
})

const containerRef = ref<HTMLElement | null>(null)
const isMounted = ref(false)
const dormitoryStore = useDormitoryStore()
const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()

const dormitories = computed(() => dormitoryStore.dormitories)

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface FlatRoomEntry {
  room: Room
  dormName: string
  dormColor: string
}

/**
 * Flatten dorms → rooms into a single list. Room names already include
 * the dorm name (e.g. "Crystal Sunshine 1"), so the dorm-level header
 * was redundant and burned vertical real estate. The dorm color is
 * still passed down as a left-edge stripe on each RoomCard so the
 * operator can tell dorms apart at a glance.
 */
const flatRooms = computed<FlatRoomEntry[]>(() => {
  const query = props.searchQuery.trim() ? normalizeText(props.searchQuery) : ''
  const out: FlatRoomEntry[] = []

  for (const dorm of dormitories.value) {
    if (!dorm.active) continue
    const dormColor = dorm.color || '#9ca3af'
    for (const room of dorm.rooms) {
      if (!room.active) continue

      if (query) {
        const matchesName =
          normalizeText(room.roomName).includes(query) ||
          normalizeText(dorm.dormitoryName).includes(query)
        const matchesGuest = room.beds.some(bed => {
          if (bed.active === false) return false
          const guestId = assignmentStore.getGuestsAssignedToBed(bed.bedId)[0]
          if (!guestId) return false
          const guest = guestStore.getGuestById(guestId)
          if (!guest) return false
          return (
            normalizeText(guest.firstName).includes(query) ||
            normalizeText(guest.lastName).includes(query) ||
            (guest.preferredName && normalizeText(guest.preferredName).includes(query)) ||
            (guest.groupName && normalizeText(guest.groupName).includes(query))
          )
        })
        if (!matchesName && !matchesGuest) continue
      }

      out.push({ room, dormName: dorm.dormitoryName, dormColor })
    }
  }
  return out
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

.rooms-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
