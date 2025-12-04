<template>
  <div class="timeline-header">
    <div class="header-left">
      <h2 class="timeline-title">Timeline View</h2>
      <div class="preset-buttons">
        <button @click="setPreset('auto-detect')" class="btn-preset" :class="{ active: isAutoDetect }">
          Auto-detect
        </button>
        <button @click="setPreset('next-7-days')" class="btn-preset">Next 7 Days</button>
        <button @click="setPreset('next-14-days')" class="btn-preset">Next 14 Days</button>
        <button @click="setPreset('this-month')" class="btn-preset">This Month</button>
      </div>
      <div class="date-pickers">
        <div class="date-picker-group">
          <label for="start-date">Start:</label>
          <input
            id="start-date"
            type="date"
            :value="startDateString"
            @change="onStartDateChange"
            class="date-input"
          />
        </div>
        <div class="date-picker-group">
          <label for="end-date">End:</label>
          <input
            id="end-date"
            type="date"
            :value="endDateString"
            @change="onEndDateChange"
            class="date-input"
          />
        </div>
        <div class="date-range-info">{{ totalDays }} days</div>
      </div>
    </div>

    <div class="header-controls">
      <button
        v-if="config.showUnassignedPanel"
        @click="timelineStore.toggleUnassignedPanel"
        class="btn-secondary"
      >
        Hide Unassigned
      </button>
      <button v-else @click="timelineStore.toggleUnassignedPanel" class="btn-secondary">
        Show Unassigned
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '@/stores/timelineStore'
import { useTimelineData } from '../composables/useTimelineData'
import { DateRangePreset } from '../types/timeline'

const timelineStore = useTimelineStore()
const { totalDays } = useTimelineData()

const config = computed(() => timelineStore.config)

const startDateString = computed(() => {
  return formatDateForInput(config.value.dateRangeStart)
})

const endDateString = computed(() => {
  return formatDateForInput(config.value.dateRangeEnd)
})

const isAutoDetect = computed(() => {
  // Check if current range matches auto-detected range
  // This is a simple heuristic - could be improved
  return false
})

function setPreset(preset: string) {
  const presetMap: Record<string, DateRangePreset> = {
    'auto-detect': DateRangePreset.AUTO_DETECT,
    'next-7-days': DateRangePreset.NEXT_7_DAYS,
    'next-14-days': DateRangePreset.NEXT_14_DAYS,
    'this-month': DateRangePreset.THIS_MONTH,
  }
  timelineStore.setDateRangePreset(presetMap[preset])
}

function onStartDateChange(event: Event) {
  const input = event.target as HTMLInputElement
  const newDate = new Date(input.value)
  if (!isNaN(newDate.getTime())) {
    timelineStore.setDateRange(newDate, config.value.dateRangeEnd)
  }
}

function onEndDateChange(event: Event) {
  const input = event.target as HTMLInputElement
  const newDate = new Date(input.value)
  if (!isNaN(newDate.getTime())) {
    timelineStore.setDateRange(config.value.dateRangeStart, newDate)
  }
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<style scoped lang="scss">
.timeline-header {
  padding: 6px 20px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.timeline-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.preset-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.btn-preset {
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }

  &.active {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
}

.btn-secondary {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
  }
}

.date-pickers {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.date-picker-group {
  display: flex;
  align-items: center;
  gap: 6px;

  label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #374151;
  }
}

.date-input {
  padding: 4px 8px;
  font-size: 0.75rem;
  color: #111827;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.date-range-info {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  padding: 4px 10px;
  background-color: #f9fafb;
  border-radius: 4px;
}
</style>
