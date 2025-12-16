<template>
  <div class="timeline-header">
    <div class="header-left">
      <h2 class="timeline-title">Timeline View</h2>
      <div class="preset-buttons">
        <button @click="setPreset('auto-detect')" class="btn-preset" :class="{ active: isAutoDetect }">
          Auto-detect
        </button>
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
      <div class="zoom-control">
        <label for="zoom-slider">Zoom:</label>
        <input
          id="zoom-slider"
          type="range"
          min="10"
          max="100"
          step="10"
          :value="columnWidth"
          @input="onZoomChange"
          class="zoom-slider"
        />
      </div>
      <button @click="handleExportExcel" class="btn-export">
        Export Excel
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '@/stores/timelineStore'
import { useGuestStore } from '@/stores/guestStore'
import { useTimelineData } from '../composables/useTimelineData'
import { useExcelExport } from '@/features/export/composables/useExcelExport'
import { DateRangePreset } from '../types/timeline'

const timelineStore = useTimelineStore()
const guestStore = useGuestStore()
const { totalDays } = useTimelineData()
const { exportTimelineToExcel } = useExcelExport()

const config = computed(() => timelineStore.config)

const columnWidth = computed(() => timelineStore.columnWidth)

const startDateString = computed(() => {
  return formatDateForInput(config.value.dateRangeStart)
})

const endDateString = computed(() => {
  return formatDateForInput(config.value.dateRangeEnd)
})

// Compute the auto-detected date range from guest data
const autoDetectedRange = computed(() => {
  if (guestStore.guests.length === 0) return null

  let earliestArrival: Date | null = null
  let latestDeparture: Date | null = null

  guestStore.guests.forEach(guest => {
    if (guest.arrival) {
      const arrivalDate = new Date(guest.arrival)
      arrivalDate.setHours(0, 0, 0, 0)
      if (!isNaN(arrivalDate.getTime())) {
        if (!earliestArrival || arrivalDate < earliestArrival) {
          earliestArrival = arrivalDate
        }
      }
    }
    if (guest.departure) {
      const departureDate = new Date(guest.departure)
      departureDate.setHours(0, 0, 0, 0)
      if (!isNaN(departureDate.getTime())) {
        if (!latestDeparture || departureDate > latestDeparture) {
          latestDeparture = departureDate
        }
      }
    }
  })

  if (earliestArrival && latestDeparture) {
    return { start: earliestArrival, end: latestDeparture }
  }
  return null
})

const isAutoDetect = computed(() => {
  if (!autoDetectedRange.value) return false

  const currentStart = new Date(config.value.dateRangeStart)
  currentStart.setHours(0, 0, 0, 0)
  const currentEnd = new Date(config.value.dateRangeEnd)
  currentEnd.setHours(0, 0, 0, 0)

  const autoStart = autoDetectedRange.value.start
  const autoEnd = autoDetectedRange.value.end

  // Check if current range matches auto-detected range (within 1 day tolerance)
  const startMatches = Math.abs(currentStart.getTime() - autoStart.getTime()) < 86400000
  const endMatches = Math.abs(currentEnd.getTime() - autoEnd.getTime()) < 86400000

  return startMatches && endMatches
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
  if (!input.value) return

  // Parse the date string in local time (YYYY-MM-DD format)
  const [year, month, day] = input.value.split('-').map(Number)
  const newDate = new Date(year, month - 1, day)

  if (!isNaN(newDate.getTime())) {
    timelineStore.setDateRange(newDate, config.value.dateRangeEnd)
  }
}

function onEndDateChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.value) return

  // Parse the date string in local time (YYYY-MM-DD format)
  const [year, month, day] = input.value.split('-').map(Number)
  const newDate = new Date(year, month - 1, day)

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

function onZoomChange(event: Event) {
  const input = event.target as HTMLInputElement
  const width = parseInt(input.value)
  timelineStore.setColumnWidth(width)
}

function handleExportExcel() {
  exportTimelineToExcel()
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

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
  }
}

.zoom-slider {
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: #d1d5db;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #2563eb;
      transform: scale(1.1);
    }
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #3b82f6;
    border: none;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #2563eb;
      transform: scale(1.1);
    }
  }
}

.btn-export {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background-color: #10b981;
  border: 1px solid #10b981;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: #059669;
    border-color: #059669;
  }
}
</style>
