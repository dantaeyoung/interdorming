/**
 * Excel Export Composable
 * Provides Excel (XLSX) export functionality for timeline and room assignments
 */

import XLSX from 'xlsx-js-style'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { Guest } from '@/types'

// Helper to convert hex color to Excel ARGB format (without the # and with alpha)
function hexToExcelColor(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  // Return as ARGB (alpha = FF for fully opaque)
  return cleanHex.toUpperCase()
}

// Helper to lighten a hex color for Excel backgrounds
function lightenHexColor(hex: string, factor: number = 0.7): string {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  // Lighten by mixing with white
  const newR = Math.round(r + (255 - r) * factor)
  const newG = Math.round(g + (255 - g) * factor)
  const newB = Math.round(b + (255 - b) * factor)

  return (
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase()
}

// Get full name for a guest
function getGuestFullName(guest: Guest): string {
  const firstName = guest.preferredName || guest.firstName || ''
  const lastName = guest.lastName || ''
  return `${firstName} ${lastName}`.trim()
}

export function useExcelExport() {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const timelineStore = useTimelineStore()

  /**
   * Export Timeline view as Excel file
   * Creates a grid with beds as rows and dates as columns
   */
  function exportTimelineToExcel(): void {
    const wb = XLSX.utils.book_new()

    // Get date range
    const startDate = new Date(timelineStore.config.dateRangeStart)
    const endDate = new Date(timelineStore.config.dateRangeEnd)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    // Generate date columns
    const dates: Date[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Create header row
    const headers = ['Dormitory', 'Room', 'Gender', 'Bed', 'Type']
    dates.forEach(date => {
      headers.push(formatDateHeader(date))
    })

    // Create data rows with styling info
    const rows: any[][] = []

    // Add header row with styling
    const headerRow = headers.map(h => ({
      v: h,
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center' }
      }
    }))
    rows.push(headerRow)

    // Track room index for alternating colors
    let roomIndex = 0

    dormitoryStore.dormitories.forEach(dorm => {
      if (!dorm.active) return

      const dormColor = dorm.color || '#f8f9fa'
      const lightDormColor = lightenHexColor(dormColor, 0.7)

      dorm.rooms.forEach(room => {
        if (!room.active) return

        // Alternate between white and light gray for date columns
        const isEvenRoom = roomIndex % 2 === 0
        const dateColumnBg = isEvenRoom ? 'FFFFFF' : 'F3F4F6'
        roomIndex++

        room.beds.forEach(bed => {
          if (bed.active === false) return

          const row: any[] = [
            // Dormitory column with color
            {
              v: dorm.dormitoryName,
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'left' }
              }
            },
            // Room column with color
            {
              v: room.roomName,
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'left' }
              }
            },
            // Gender column with color
            {
              v: room.roomGender,
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center' }
              }
            },
            // Bed column with color
            {
              v: String(bed.position),
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center' }
              }
            },
            // Type column with color
            {
              v: bed.bedType,
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center' }
              }
            },
          ]

          // Fill in guest names for each date with alternating room background
          dates.forEach(date => {
            const guestName = getGuestOnBedForDate(bed.bedId, date)
            row.push({
              v: guestName,
              s: {
                fill: { fgColor: { rgb: dateColumnBg } },
                alignment: { horizontal: 'left' }
              }
            })
          })

          rows.push(row)
        })
      })
    })

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Set column widths
    const colWidths = [
      { wch: 18 }, // Dormitory
      { wch: 18 }, // Room
      { wch: 8 },  // Gender
      { wch: 5 },  // Bed
      { wch: 8 },  // Type
    ]
    dates.forEach(() => {
      colWidths.push({ wch: 18 }) // Wider for full names
    })
    ws['!cols'] = colWidths

    // Freeze first row (header) and first 5 columns using Excel views format
    if (!ws['!views']) ws['!views'] = []
    ws['!views'].push({
      state: 'frozen',
      xSplit: 5,
      ySplit: 1,
      topLeftCell: 'F2',
      activeCell: 'F2'
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Timeline')

    // Add summary sheet
    const summaryWs = createSummarySheet()
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Download file
    const filename = generateFilename('timeline')
    XLSX.writeFile(wb, filename)
  }

  /**
   * Export Room Assignments as Excel file
   * Shows all guests with their assigned rooms
   */
  function exportAssignmentsToExcel(): void {
    const wb = XLSX.utils.book_new()

    // Create header row with styling
    const headers = [
      'First Name',
      'Last Name',
      'Preferred Name',
      'Gender',
      'Age',
      'Group',
      'Lower Bunk?',
      'Arrival',
      'Departure',
      'Dormitory',
      'Room',
      'Bed ID',
      'Bed Type',
      'Status',
    ]

    const headerRow = headers.map(h => ({
      v: h,
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center' }
      }
    }))

    // Create data rows
    const rows: any[][] = [headerRow]

    // Add assigned guests
    guestStore.guests.forEach(guest => {
      const bedId = assignmentStore.getAssignmentByGuest(guest.id)
      const room = bedId ? dormitoryStore.getRoomByBedId(bedId) : undefined
      const bed = bedId ? dormitoryStore.getBedById(bedId) : undefined
      const dorm = bedId ? dormitoryStore.getDormitoryByBedId(bedId) : undefined

      const dormColor = dorm?.color || '#f8f9fa'
      const lightDormColor = bedId ? lightenHexColor(dormColor, 0.7) : 'FFFFFF'

      rows.push([
        guest.firstName || '',
        guest.lastName || '',
        guest.preferredName || '',
        guest.gender || '',
        guest.age || '',
        guest.groupName || '',
        guest.lowerBunk ? 'Yes' : 'No',
        guest.arrival || '',
        guest.departure || '',
        // Dormitory with color
        {
          v: dorm?.dormitoryName || '',
          s: bedId ? {
            fill: { fgColor: { rgb: lightDormColor } }
          } : {}
        },
        // Room with color
        {
          v: room?.roomName || '',
          s: bedId ? {
            fill: { fgColor: { rgb: lightDormColor } }
          } : {}
        },
        bedId || '',
        bed?.bedType || '',
        bedId ? 'Assigned' : 'Unassigned',
      ])
    })

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // First Name
      { wch: 12 }, // Last Name
      { wch: 12 }, // Preferred Name
      { wch: 8 },  // Gender
      { wch: 5 },  // Age
      { wch: 12 }, // Group
      { wch: 10 }, // Lower Bunk
      { wch: 12 }, // Arrival
      { wch: 12 }, // Departure
      { wch: 18 }, // Dormitory
      { wch: 18 }, // Room
      { wch: 10 }, // Bed ID
      { wch: 8 },  // Bed Type
      { wch: 10 }, // Status
    ]

    // Freeze header row using Excel views format
    if (!ws['!views']) ws['!views'] = []
    ws['!views'].push({
      state: 'frozen',
      xSplit: 0,
      ySplit: 1,
      topLeftCell: 'A2',
      activeCell: 'A2'
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Assignments')

    // Add unassigned sheet
    const unassignedWs = createUnassignedSheet()
    XLSX.utils.book_append_sheet(wb, unassignedWs, 'Unassigned')

    // Add summary sheet
    const summaryWs = createSummarySheet()
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Download file
    const filename = generateFilename('assignments')
    XLSX.writeFile(wb, filename)
  }

  /**
   * Get guest full name assigned to a bed on a specific date
   */
  function getGuestOnBedForDate(bedId: string, date: Date): string {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    // Find all guests assigned to this bed
    const guestsOnBed: Guest[] = []

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
          guestsOnBed.push(guest)
        }
      }
    })

    if (guestsOnBed.length === 0) {
      return ''
    } else if (guestsOnBed.length === 1) {
      return getGuestFullName(guestsOnBed[0])
    } else {
      // Multiple guests = conflict
      return guestsOnBed.map(g => getGuestFullName(g)).join(' / ') + ' ⚠️'
    }
  }

  /**
   * Create a summary sheet with statistics
   */
  function createSummarySheet(): XLSX.WorkSheet {
    const data = [
      [{ v: 'Dorm Assignment Summary', s: { font: { bold: true, sz: 14 } } }],
      [''],
      ['Generated', new Date().toLocaleString()],
      [''],
      [{ v: 'Statistics', s: { font: { bold: true } } }],
      ['Total Guests', guestStore.guests.length],
      ['Assigned', assignmentStore.assignedCount],
      ['Unassigned', assignmentStore.unassignedCount],
      [''],
      ['Total Beds', dormitoryStore.getAllBeds.length],
      ['Total Rooms', dormitoryStore.getAllRooms.length],
      ['Total Dormitories', dormitoryStore.dormitories.length],
      [''],
      [{ v: 'Date Range', s: { font: { bold: true } } }],
      ['Start', formatDateFull(timelineStore.config.dateRangeStart)],
      ['End', formatDateFull(timelineStore.config.dateRangeEnd)],
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }]

    return ws
  }

  /**
   * Create a sheet with unassigned guests only
   */
  function createUnassignedSheet(): XLSX.WorkSheet {
    const headers = [
      'First Name',
      'Last Name',
      'Preferred Name',
      'Gender',
      'Age',
      'Group',
      'Lower Bunk?',
      'Arrival',
      'Departure',
    ]

    const headerRow = headers.map(h => ({
      v: h,
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center' }
      }
    }))

    const rows: any[][] = [headerRow]

    assignmentStore.unassignedGuestIds.forEach(guestId => {
      const guest = guestStore.getGuestById(guestId)
      if (!guest) return

      rows.push([
        guest.firstName || '',
        guest.lastName || '',
        guest.preferredName || '',
        guest.gender || '',
        guest.age || '',
        guest.groupName || '',
        guest.lowerBunk ? 'Yes' : 'No',
        guest.arrival || '',
        guest.departure || '',
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 5 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ]

    // Freeze header row using Excel views format
    if (!ws['!views']) ws['!views'] = []
    ws['!views'].push({
      state: 'frozen',
      xSplit: 0,
      ySplit: 1,
      topLeftCell: 'A2',
      activeCell: 'A2'
    })

    return ws
  }

  /**
   * Format date for header (M/D)
   */
  function formatDateHeader(date: Date): string {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekday = weekdays[date.getDay()]
    return `${weekday} ${date.getMonth() + 1}/${date.getDate()}`
  }

  /**
   * Format date as full string
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
   * Generate timestamped filename
   */
  function generateFilename(type: 'timeline' | 'assignments'): string {
    const date = new Date().toISOString().split('T')[0]
    return `dorm-${type}_${date}.xlsx`
  }

  return {
    exportTimelineToExcel,
    exportAssignmentsToExcel,
  }
}
