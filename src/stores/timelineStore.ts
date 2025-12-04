/**
 * Timeline Store
 * Manages timeline-specific configuration (date range, UI state)
 * Uses existing assignments from assignmentStore - no duplicate data
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGuestStore } from './guestStore'
import { useAssignmentStore } from './assignmentStore'
import type { TimelineConfig, DateRangePreset } from '@/features/timeline/types/timeline'

export const useTimelineStore = defineStore(
  'timeline',
  () => {
    // Get stores once at setup
    const assignmentStore = useAssignmentStore()
    const guestStore = useGuestStore()

    // State - only timeline-specific UI configuration
    const config = ref<TimelineConfig>({
      dateRangeStart: new Date(),
      dateRangeEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      collapsedDorms: [],
      showUnassignedPanel: false,
    })

    // Column width for zoom control (10-100 scale)
    const columnWidth = ref(50)

    // Getters
    const isDormCollapsed = computed(() => {
      return (dormId: string): boolean => {
        return config.value.collapsedDorms.includes(dormId)
      }
    })

    /**
     * Check if a bed has conflicts on a specific date
     * (multiple guests assigned to same bed with overlapping dates)
     */
    const hasConflictOnDate = computed(() => {
      return (bedId: string, date: Date): boolean => {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)

        // Find all guests assigned to this bed whose date ranges include this date
        const guestsOnBed: string[] = []

        assignmentStore.assignments.forEach((assignedBedId, guestId) => {
          if (assignedBedId !== bedId) return

          const guest = guestStore.getGuestById(guestId)
          if (!guest) return

          // Check if guest's date range includes target date
          if (guest.arrival && guest.departure) {
            const arrival = new Date(guest.arrival)
            arrival.setHours(0, 0, 0, 0)
            const departure = new Date(guest.departure)
            departure.setHours(0, 0, 0, 0)

            if (targetDate >= arrival && targetDate <= departure) {
              guestsOnBed.push(guestId)
            }
          }
        })

        return guestsOnBed.length > 1
      }
    })

    // Actions
    function setDateRange(start: Date, end: Date) {
      config.value.dateRangeStart = start
      config.value.dateRangeEnd = end
    }

    function setDateRangePreset(preset: DateRangePreset) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      switch (preset) {
        case DateRangePreset.AUTO_DETECT:
          autoDetectDateRange()
          break

        case DateRangePreset.NEXT_7_DAYS:
          config.value.dateRangeStart = new Date(today)
          config.value.dateRangeEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          break

        case DateRangePreset.NEXT_14_DAYS:
          config.value.dateRangeStart = new Date(today)
          config.value.dateRangeEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
          break

        case DateRangePreset.THIS_MONTH:
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          config.value.dateRangeStart = firstDay
          config.value.dateRangeEnd = lastDay
          break
      }
    }

    function autoDetectDateRange() {
      if (guestStore.guests.length === 0) {
        // Default to next 7 days if no guests
        setDateRangePreset(DateRangePreset.NEXT_7_DAYS)
        return
      }

      let earliestArrival: Date | null = null
      let latestDeparture: Date | null = null

      guestStore.guests.forEach(guest => {
        if (guest.arrival) {
          const arrivalDate = new Date(guest.arrival)
          if (!earliestArrival || arrivalDate < earliestArrival) {
            earliestArrival = arrivalDate
          }
        }
        if (guest.departure) {
          const departureDate = new Date(guest.departure)
          if (!latestDeparture || departureDate > latestDeparture) {
            latestDeparture = departureDate
          }
        }
      })

      if (earliestArrival && latestDeparture) {
        config.value.dateRangeStart = earliestArrival
        config.value.dateRangeEnd = latestDeparture
      } else {
        // Fallback to next 7 days
        setDateRangePreset(DateRangePreset.NEXT_7_DAYS)
      }
    }

    function toggleDormCollapse(dormId: string) {
      const index = config.value.collapsedDorms.indexOf(dormId)
      if (index !== -1) {
        config.value.collapsedDorms.splice(index, 1)
      } else {
        config.value.collapsedDorms.push(dormId)
      }
    }

    function toggleUnassignedPanel() {
      config.value.showUnassignedPanel = !config.value.showUnassignedPanel
    }

    function setColumnWidth(width: number) {
      columnWidth.value = width
    }

    // Initialize date range from guest data on first load
    // Only auto-detect if dates are still at default values (today + 7 days)
    function initializeDateRange() {
      const now = new Date()
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      // Check if config is still at default values (not persisted)
      const isDefaultRange =
        Math.abs(config.value.dateRangeStart.getTime() - now.getTime()) < 60000 && // Within 1 minute of now
        Math.abs(config.value.dateRangeEnd.getTime() - sevenDaysFromNow.getTime()) < 60000

      if (isDefaultRange && guestStore.guests.length > 0) {
        autoDetectDateRange()
      }
    }

    // Call initialization
    initializeDateRange()

    return {
      // State
      config,
      columnWidth,

      // Getters
      isDormCollapsed,
      hasConflictOnDate,

      // Actions
      setDateRange,
      setDateRangePreset,
      autoDetectDateRange,
      toggleDormCollapse,
      toggleUnassignedPanel,
      setColumnWidth,
    }
  },
  {
    persist: {
      key: 'dormAssignments-timeline',
      paths: ['config', 'columnWidth'],
      serializer: {
        serialize: state => {
          return JSON.stringify({
            config: {
              dateRangeStart: state.config.dateRangeStart.toISOString(),
              dateRangeEnd: state.config.dateRangeEnd.toISOString(),
              collapsedDorms: state.config.collapsedDorms,
              showUnassignedPanel: state.config.showUnassignedPanel,
            },
            columnWidth: state.columnWidth,
          })
        },
        deserialize: str => {
          const parsed = JSON.parse(str)
          return {
            config: {
              dateRangeStart: new Date(parsed.config?.dateRangeStart || Date.now()),
              dateRangeEnd: new Date(
                parsed.config?.dateRangeEnd || Date.now() + 7 * 24 * 60 * 60 * 1000
              ),
              collapsedDorms: parsed.config?.collapsedDorms || [],
              showUnassignedPanel: parsed.config?.showUnassignedPanel || false,
            },
            columnWidth: parsed.columnWidth || 50,
          }
        },
      },
    },
  }
)
