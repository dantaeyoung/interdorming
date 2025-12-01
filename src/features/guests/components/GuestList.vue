<template>
  <div class="guest-list">
    <div v-if="guests.length === 0" class="empty-state">
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyMessage }}</p>
    </div>

    <table v-else class="table">
      <thead>
        <tr>
          <th @click="handleSort('firstName')">
            Name
            <SortIndicator :active="sortColumn === 'firstName'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('lastName')">
            Last Name
            <SortIndicator :active="sortColumn === 'lastName'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('gender')">
            Gender
            <SortIndicator :active="sortColumn === 'gender'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('age')">
            Age
            <SortIndicator :active="sortColumn === 'age'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('lowerBunk')">
            Lower Bunk
            <SortIndicator :active="sortColumn === 'lowerBunk'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('groupName')">
            Group
            <SortIndicator :active="sortColumn === 'groupName'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('arrival')">
            Arrival
            <SortIndicator :active="sortColumn === 'arrival'" :direction="sortDirection" />
          </th>
          <th @click="handleSort('departure')">
            Departure
            <SortIndicator :active="sortColumn === 'departure'" :direction="sortDirection" />
          </th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody v-bind="dropzoneProps">
        <GuestRow v-for="guest in guests" :key="guest.id" :guest="guest" />
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'
import GuestRow from './GuestRow.vue'
import type { Guest } from '@/types'

interface Props {
  showAssigned?: boolean
  emptyTitle?: string
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  showAssigned: false,
  emptyTitle: 'No guests loaded',
  emptyMessage: 'Upload a CSV file to begin assigning guests to dormitory beds.',
})

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const { useDroppableUnassignedArea } = useDragDrop()

const guests = computed(() => {
  const filtered = guestStore.filteredGuests

  if (props.showAssigned) {
    return filtered
  }

  // Show only unassigned guests
  return filtered.filter(g => !assignmentStore.assignments.has(g.id))
})

const sortColumn = computed(() => guestStore.sortColumn)
const sortDirection = computed(() => guestStore.sortDirection)

function handleSort(column: keyof Guest) {
  guestStore.setSortColumn(column)
}

function handleUnassign(guestId: string) {
  assignmentStore.unassignGuest(guestId)
}

const dropzoneProps = useDroppableUnassignedArea(handleUnassign)
</script>

<script lang="ts">
// SortIndicator component defined inline
import { defineComponent, h } from 'vue'

const SortIndicator = defineComponent({
  props: {
    active: Boolean,
    direction: String,
  },
  setup(props) {
    return () => {
      if (!props.active) return null
      return h('span', { class: 'sort-indicator active' }, props.direction === 'asc' ? '▲' : '▼')
    }
  },
})

export { SortIndicator }
</script>

<style scoped lang="scss">
.guest-list {
  width: 100%;
  overflow-x: auto;
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

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;

  thead {
    background-color: #f9fafb;
    border-bottom: 2px solid #e5e7eb;

    th {
      padding: 12px;
      text-align: left;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;

      &:hover {
        background-color: #f3f4f6;
      }
    }
  }

  tbody {
    &.drag-over {
      background-color: #f0f9ff;
      outline: 2px dashed #3b82f6;
      outline-offset: -2px;
    }
  }
}

.sort-indicator {
  margin-left: 4px;
  font-size: 0.75rem;
  color: #9ca3af;

  &.active {
    color: #3b82f6;
  }
}
</style>
