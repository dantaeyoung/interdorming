/**
 * Timeline Data Composable
 * Manages timeline data rendering, date calculations, and bed row generation
 * Uses existing assignments from assignmentStore - no duplicate data
 */

import { computed } from 'vue'
import { useTimelineStore } from '@/stores/timelineStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import type {
  DateColumn,
  TimelineBedRow,
  GuestBlobData,
} from '@/features/timeline/types/timeline'

export function useTimelineData() {
  const timelineStore = useTimelineStore()
  const dormitoryStore = useDormitoryStore()
  const guestStore = useGuestStore()
  const assignmentStore = useAssignmentStore()

  /**
   * Generate array of date columns for the timeline header
   */
  const dateColumns = computed((): DateColumn[] => {
    const columns: DateColumn[] = []
    const start = new Date(timelineStore.config.dateRangeStart)
    const end = new Date(timelineStore.config.dateRangeEnd)

    // Normalize to midnight
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    let currentDate = new Date(start)
    let index = 0

    while (currentDate <= end) {
      const dateObj = new Date(currentDate)

      columns.push({
        date: dateObj,
        label: formatDateShort(dateObj),
        fullLabel: formatDateFull(dateObj),
        index,
      })

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
      index++
    }

    return columns
  })

  /**
   * Group date columns by month for header display
   * Returns array of { month: string, year: number, startIndex: number, colspan: number }
   */
  const monthGroups = computed(() => {
    const groups: Array<{ month: string; year: number; startIndex: number; colspan: number }> = []
    const cols = dateColumns.value

    if (cols.length === 0) return groups

    let currentMonth = cols[0].date.getMonth()
    let currentYear = cols[0].date.getFullYear()
    let startIndex = 0
    let count = 0

    cols.forEach((col, idx) => {
      const month = col.date.getMonth()
      const year = col.date.getFullYear()

      if (month !== currentMonth || year !== currentYear) {
        // Save previous month group
        groups.push({
          month: getMonthName(currentMonth),
          year: currentYear,
          startIndex,
          colspan: count,
        })

        // Start new month group
        currentMonth = month
        currentYear = year
        startIndex = idx
        count = 1
      } else {
        count++
      }
    })

    // Add last month group
    if (count > 0) {
      groups.push({
        month: getMonthName(currentMonth),
        year: currentYear,
        startIndex,
        colspan: count,
      })
    }

    return groups
  })

  /**
   * Get month name from month index (0-11)
   */
  function getMonthName(monthIndex: number): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    return monthNames[monthIndex]
  }

  /**
   * Generate array of bed rows for the timeline table
   */
  const bedRows = computed((): TimelineBedRow[] => {
    const rows: TimelineBedRow[] = []

    dormitoryStore.dormitories.forEach(dorm => {
      if (!dorm.active) return // Skip inactive dormitories

      dorm.rooms.forEach(room => {
        if (!room.active) return // Skip inactive rooms

        room.beds.forEach((bed, bedIndex) => {
          if (bed.active === false) return // Skip inactive beds

          rows.push({
            dormitory: {
              id: dorm.dormitoryName, // Use name as ID since there's no separate ID
              name: dorm.dormitoryName,
              color: dorm.color, // Add color property
            },
            room: {
              id: `${dorm.dormitoryName}-${room.roomName}`, // Composite ID
              name: room.roomName,
              gender: room.roomGender === 'M' ? 'male' : room.roomGender === 'F' ? 'female' : 'any',
            },
            bed: {
              id: bed.bedId,
              bedNumber: bedIndex + 1, // Use array index + 1 as bed number
              bedType: bed.bedType,
              position: bed.position,
            },
            isCollapsed: timelineStore.isDormCollapsed(dorm.dormitoryName),
          })
        })
      })
    })

    return rows
  })

  /**
   * Generate guest blob data for rendering
   * Returns map of bedId -> array of guest blobs
   * Uses existing assignments from assignmentStore + guest date ranges
   */
  const guestBlobsByBed = computed((): Map<string, GuestBlobData[]> => {
    const blobMap = new Map<string, GuestBlobData[]>()
    const dateColsArray = dateColumns.value

    // Iterate through all assignments
    assignmentStore.assignments.forEach((bedId, guestId) => {
      const guest = guestStore.getGuestById(guestId)
      if (!guest) return

      // Use guest's arrival and departure dates
      if (!guest.arrival || !guest.departure) return

      // Normalize dates to midnight for comparison
      const arrival = new Date(guest.arrival)
      arrival.setHours(0, 0, 0, 0)
      const departure = new Date(guest.departure)
      departure.setHours(0, 0, 0, 0)

      const rangeStart = new Date(timelineStore.config.dateRangeStart)
      rangeStart.setHours(0, 0, 0, 0)
      const rangeEnd = new Date(timelineStore.config.dateRangeEnd)
      rangeEnd.setHours(0, 0, 0, 0)

      // Skip if guest stay doesn't overlap with visible range
      if (departure < rangeStart || arrival > rangeEnd) return

      // Find start and end column indices
      const arrivalTime = arrival.getTime()
      const departureTime = departure.getTime()

      const startColIndex = dateColsArray.findIndex(col => {
        const colDate = new Date(col.date)
        colDate.setHours(0, 0, 0, 0)
        return colDate.getTime() === arrivalTime
      })

      const endColIndex = dateColsArray.findIndex(col => {
        const colDate = new Date(col.date)
        colDate.setHours(0, 0, 0, 0)
        return colDate.getTime() === departureTime
      })

      // Clamp to visible range
      const visibleStartIndex = Math.max(0, startColIndex === -1 ? 0 : startColIndex)
      const visibleEndIndex = Math.min(
        dateColsArray.length - 1,
        endColIndex === -1 ? dateColsArray.length - 1 : endColIndex
      )

      const spanCount = visibleEndIndex - visibleStartIndex + 1

      const blobData: GuestBlobData = {
        guestId,
        displayName: guest.preferredName || guest.firstName,
        bedId,
        startColIndex: visibleStartIndex,
        endColIndex: visibleEndIndex,
        spanCount,
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          preferredName: guest.preferredName,
          age: typeof guest.age === 'string' ? parseInt(guest.age) : guest.age,
          gender: guest.gender === 'M' ? 'male' : 'female',
          groupName: guest.groupName,
          lowerBunk: guest.lowerBunk,
          arrival,
          departure,
        },
      }

      if (!blobMap.has(bedId)) {
        blobMap.set(bedId, [])
      }
      blobMap.get(bedId)!.push(blobData)
    })

    return blobMap
  })

  /**
   * Get guest blobs for a specific bed
   */
  function getGuestBlobsForBed(bedId: string): GuestBlobData[] {
    return guestBlobsByBed.value.get(bedId) || []
  }

  /**
   * Format date as M/D (e.g., "12/1")
   */
  function formatDateShort(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  /**
   * Format date as full string (e.g., "Monday, December 1, 2025")
   */
  function formatDateFull(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  /**
   * Get number of days in current date range
   */
  const totalDays = computed(() => {
    return dateColumns.value.length
  })

  /**
   * Check if a bed has any assignments in the visible date range
   */
  function bedHasAssignments(bedId: string): boolean {
    return guestBlobsByBed.value.has(bedId)
  }

  return {
    dateColumns,
    monthGroups,
    bedRows,
    guestBlobsByBed,
    totalDays,
    getGuestBlobsForBed,
    bedHasAssignments,
    formatDateShort,
    formatDateFull,
  }
}
