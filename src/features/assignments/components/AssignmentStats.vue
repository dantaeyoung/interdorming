<template>
  <div class="assignment-stats">
    <div class="stat-card">
      <div class="stat-label">Total Guests</div>
      <div class="stat-value">{{ totalGuests }}</div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Unassigned</div>
      <div class="stat-value" :class="{ 'text-warning': unassignedCount > 0 }">
        {{ unassignedCount }}
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Assigned</div>
      <div class="stat-value text-success">{{ assignedCount }}</div>
    </div>

    <div v-if="totalBeds > 0" class="stat-card">
      <div class="stat-label">Available Beds</div>
      <div class="stat-value">{{ availableBeds }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const dormitoryStore = useDormitoryStore()

const totalGuests = computed(() => guestStore.guests.length)
const assignedCount = computed(() => assignmentStore.assignedCount)
const unassignedCount = computed(() => totalGuests.value - assignedCount.value)
const totalBeds = computed(() => dormitoryStore.getAllBeds.length)
const availableBeds = computed(() => totalBeds.value - assignedCount.value)
</script>

<style scoped lang="scss">
.assignment-stats {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.stat-card {
  padding: 2px 10px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 60px;
}

.stat-label {
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 1px;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: white;
  line-height: 1;

  &.text-warning {
    color: #fcd34d;
  }

  &.text-success {
    color: #6ee7b7;
  }
}
</style>
