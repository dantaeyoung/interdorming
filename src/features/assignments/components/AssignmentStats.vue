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
  gap: 8px;
  flex-shrink: 0;
}

.stat-card {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.08) 0%, rgba(146, 64, 14, 0.08) 100%);
  border: 1px solid rgba(180, 83, 9, 0.2);
  border-radius: 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 70px;
}

.stat-label {
  font-size: 0.6rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;

  &.text-warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
  }

  &.text-success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    background-clip: text;
  }
}
</style>
