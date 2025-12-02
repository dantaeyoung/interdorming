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
const totalBeds = computed(() => dormitoryStore.getAllBeds.value.length)
const availableBeds = computed(() => totalBeds.value - assignedCount.value)
</script>

<style scoped lang="scss">
.assignment-stats {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
}

.stat-card {
  flex: 1;
  padding: 12px 16px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;

  &.text-warning {
    color: #f59e0b;
  }

  &.text-success {
    color: #10b981;
  }
}
</style>
