<template>
  <div class="room-list">
    <div v-if="dormitories.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else ref="containerRef" class="rooms-container">
      <div v-if="hasOverridesOnViewDate" class="override-banner" title="One or more configuration overrides are active on this date. Edit them in the Room Configuration tab.">
        <span class="override-badge">📅</span> Overrides active on {{ viewDateLabel }} — layout differs from base config.
      </div>
      <RoomGroupLinesOverlay v-if="isMounted && containerRef" :containerRef="containerRef" />
      <RoomCard
        v-for="entry in flatRooms"
        :key="`${entry.dormName}::${entry.room.roomName}`"
        :room="entry.room"
        :view-date="viewDate"
        :dorm-color="entry.dormColor"
        :gender-overridden="entry.genderOverridden"
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

/**
 * Convert the View Date prop into a YYYY-MM-DD string in local time so
 * `dormitoriesAt` can resolve overrides. Null/undefined → null (raw base
 * tree, no override resolution).
 */
function viewDateISO(d: Date | null | undefined): string | null {
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dormitories = computed(() => dormitoryStore.dormitoriesAt(viewDateISO(props.viewDate)))

/**
 * Rooms whose effective gender differs from base on the View Date —
 * surfaced as a small 📅 badge so the operator knows the label is
 * driven by an override, not a base-config edit.
 */
const genderOverriddenKeys = computed(() => {
  const out = new Set<string>()
  const date = viewDateISO(props.viewDate)
  if (!date) return out
  for (const dorm of dormitoryStore.dormitories) {
    for (const room of dorm.rooms) {
      const effective = dormitoryStore.roomGenderAt(dorm.dormitoryName, room.roomName, date)
      if (effective && effective !== room.roomGender) {
        out.add(`${dorm.dormitoryName}::${room.roomName}`)
      }
    }
  }
  return out
})

const hasOverridesOnViewDate = computed(() => {
  const date = viewDateISO(props.viewDate)
  if (!date) return false
  // Cheap predicate: any override whose window covers viewDate.
  return dormitoryStore.overrides.some(o => {
    if (o.effectiveFrom > date) return false
    if (o.effectiveTo === null) return true
    return o.effectiveTo >= date
  })
})

const viewDateLabel = computed(() => {
  if (!props.viewDate) return ''
  return props.viewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface FlatRoomEntry {
  room: Room
  dormName: string
  dormColor: string
  genderOverridden: boolean
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

      const key = `${dorm.dormitoryName}::${room.roomName}`
      out.push({
        room,
        dormName: dorm.dormitoryName,
        dormColor,
        genderOverridden: genderOverriddenKeys.value.has(key),
      })
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

.override-banner {
  padding: 6px 12px;
  margin-bottom: 4px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #92400e;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: help;
}

.override-badge {
  font-size: 0.85rem;
}
</style>
