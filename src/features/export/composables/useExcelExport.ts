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

// Thin gray border style for grid lines
const thinBorder = {
  style: 'thin',
  color: { rgb: 'D1D5DB' }
}

// Medium border for guest blob outlines
const mediumBorder = {
  style: 'medium',
  color: { rgb: '6B7280' }
}

// Helper to lighten a hex color for Excel backgrounds
function lightenHexColor(hex: string, factor: number = 0.7): string {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

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

// Format date string to ensure 4-digit year (MM/DD/YYYY)
function formatDateWithFullYear(dateStr: string | undefined): string {
  if (!dateStr) return ''

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()

    return `${month}/${day}/${year}`
  } catch {
    return dateStr
  }
}

// Convert column number to Excel column letter (0 = A, 1 = B, etc.)
function colToLetter(col: number): string {
  let letter = ''
  let temp = col
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

// Get cell reference like "A1", "B2", etc.
function cellRef(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`
}

export function useExcelExport() {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const timelineStore = useTimelineStore()

  /**
   * Get guest stays for a bed - returns array of {guest, startCol, endCol}
   */
  function getGuestStaysForBed(bedId: string, dates: Date[], dateStartCol: number): Array<{guest: Guest, startCol: number, endCol: number}> {
    const stays: Array<{guest: Guest, startCol: number, endCol: number}> = []

    assignmentStore.assignments.forEach((assignedBedId, guestId) => {
      if (assignedBedId !== bedId) return

      const guest = guestStore.getGuestById(guestId)
      if (!guest || !guest.arrival || !guest.departure) return

      const arrival = new Date(guest.arrival)
      arrival.setHours(0, 0, 0, 0)
      const departure = new Date(guest.departure)
      departure.setHours(0, 0, 0, 0)

      let startCol = -1
      let endCol = -1

      dates.forEach((date, idx) => {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)

        if (targetDate >= arrival && targetDate <= departure) {
          if (startCol === -1) startCol = dateStartCol + idx
          endCol = dateStartCol + idx
        }
      })

      if (startCol !== -1) {
        stays.push({ guest, startCol, endCol })
      }
    })

    return stays
  }

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

    const DATE_START_COL = 5 // Columns A-E are fixed, dates start at F (index 5)

    // Create header row
    const headers = ['Dormitory', 'Room', 'Gender', 'Bed', 'Type']
    dates.forEach(date => {
      headers.push(formatDateHeader(date))
    })

    // Build the worksheet data
    const wsData: any[][] = []
    const merges: Array<{s: {r: number, c: number}, e: {r: number, c: number}}> = []

    // Track which cells are part of a guest blob for border application
    const guestBlobCells: Map<string, {isStart: boolean, isEnd: boolean, isTop: boolean, isBottom: boolean}> = new Map()

    // Add header row with styling
    const headerRow = headers.map((h, colIdx) => ({
      v: h,
      t: 's',
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder
        }
      }
    }))
    wsData.push(headerRow)

    // Track room index for alternating colors
    let roomIndex = 0
    let currentRow = 1 // Row 0 is header

    dormitoryStore.dormitories.forEach(dorm => {
      if (!dorm.active) return

      const dormColor = dorm.color || '#f8f9fa'
      const lightDormColor = lightenHexColor(dormColor, 0.7)

      dorm.rooms.forEach(room => {
        if (!room.active) return

        const isEvenRoom = roomIndex % 2 === 0
        const dateColumnBg = isEvenRoom ? 'FFFFFF' : 'F3F4F6'
        roomIndex++

        room.beds.forEach(bed => {
          if (bed.active === false) return

          // Get guest stays for this bed
          const guestStays = getGuestStaysForBed(bed.bedId, dates, DATE_START_COL)

          const row: any[] = [
            // Fixed columns with dormitory color
            {
              v: dorm.dormitoryName,
              t: 's',
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
              }
            },
            {
              v: room.roomName,
              t: 's',
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
              }
            },
            {
              v: room.roomGender,
              t: 's',
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
              }
            },
            {
              v: String(bed.position),
              t: 's',
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
              }
            },
            {
              v: bed.bedType,
              t: 's',
              s: {
                fill: { fgColor: { rgb: lightDormColor } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
              }
            },
          ]

          // Create a map of column -> guest for this row
          const colToGuest: Map<number, Guest> = new Map()
          guestStays.forEach(stay => {
            for (let c = stay.startCol; c <= stay.endCol; c++) {
              colToGuest.set(c, stay.guest)
            }
          })

          // Fill in date columns
          for (let i = 0; i < dates.length; i++) {
            const colIdx = DATE_START_COL + i
            const guest = colToGuest.get(colIdx)

            // Find if this is part of a guest stay
            const stay = guestStays.find(s => colIdx >= s.startCol && colIdx <= s.endCol)

            // Determine border styles for this cell
            const isGuestCell = !!stay
            const isStartOfStay = stay && colIdx === stay.startCol
            const isEndOfStay = stay && colIdx === stay.endCol

            // Guest blob uses a slightly darker background
            const cellBg = isGuestCell ? 'E5E7EB' : dateColumnBg

            const cellStyle: any = {
              fill: { fgColor: { rgb: cellBg } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: {
                top: isGuestCell ? mediumBorder : thinBorder,
                bottom: isGuestCell ? mediumBorder : thinBorder,
                left: isStartOfStay ? mediumBorder : thinBorder,
                right: isEndOfStay ? mediumBorder : thinBorder
              }
            }

            // Only show name in first cell of stay (will be merged)
            const cellValue = isStartOfStay && guest ? getGuestFullName(guest) : ''

            row.push({
              v: cellValue,
              t: 's',
              s: cellStyle
            })

            // Add merge for guest stays (merge from start to end)
            if (isStartOfStay && stay && stay.endCol > stay.startCol) {
              merges.push({
                s: { r: currentRow, c: stay.startCol },
                e: { r: currentRow, c: stay.endCol }
              })
            }
          }

          wsData.push(row)
          currentRow++
        })
      })
    })

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Apply merges
    ws['!merges'] = merges

    // Set column widths
    const colWidths = [
      { wch: 18 }, // Dormitory
      { wch: 18 }, // Room
      { wch: 8 },  // Gender
      { wch: 5 },  // Bed
      { wch: 8 },  // Type
    ]
    dates.forEach(() => {
      colWidths.push({ wch: 14 }) // Date columns
    })
    ws['!cols'] = colWidths

    // Set row heights
    const rowHeights: Array<{hpt: number}> = []
    for (let i = 0; i < currentRow; i++) {
      rowHeights.push({ hpt: 20 }) // 20 points height
    }
    ws['!rows'] = rowHeights

    // Freeze panes - try the SheetJS pane structure
    ws['!freeze'] = { xSplit: 5, ySplit: 1 }

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
      t: 's',
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder
        }
      }
    }))

    // Create data rows
    const rows: any[][] = [headerRow]

    // Add guests
    guestStore.guests.forEach(guest => {
      const bedId = assignmentStore.getAssignmentByGuest(guest.id)
      const room = bedId ? dormitoryStore.getRoomByBedId(bedId) : undefined
      const bed = bedId ? dormitoryStore.getBedById(bedId) : undefined
      const dorm = bedId ? dormitoryStore.getDormitoryByBedId(bedId) : undefined

      const dormColor = dorm?.color || '#f8f9fa'
      const lightDormColor = bedId ? lightenHexColor(dormColor, 0.7) : 'FFFFFF'

      const cellBorder = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder
      }

      rows.push([
        { v: guest.firstName || '', t: 's', s: { border: cellBorder } },
        { v: guest.lastName || '', t: 's', s: { border: cellBorder } },
        { v: guest.preferredName || '', t: 's', s: { border: cellBorder } },
        { v: guest.gender || '', t: 's', s: { border: cellBorder } },
        { v: guest.age || '', t: 's', s: { border: cellBorder } },
        { v: guest.groupName || '', t: 's', s: { border: cellBorder } },
        { v: guest.lowerBunk ? 'Yes' : 'No', t: 's', s: { border: cellBorder } },
        { v: formatDateWithFullYear(guest.arrival), t: 's', s: { border: cellBorder } },
        { v: formatDateWithFullYear(guest.departure), t: 's', s: { border: cellBorder } },
        {
          v: dorm?.dormitoryName || '',
          t: 's',
          s: {
            fill: bedId ? { fgColor: { rgb: lightDormColor } } : undefined,
            border: cellBorder
          }
        },
        {
          v: room?.roomName || '',
          t: 's',
          s: {
            fill: bedId ? { fgColor: { rgb: lightDormColor } } : undefined,
            border: cellBorder
          }
        },
        { v: bedId || '', t: 's', s: { border: cellBorder } },
        { v: bed?.bedType || '', t: 's', s: { border: cellBorder } },
        { v: bedId ? 'Assigned' : 'Unassigned', t: 's', s: { border: cellBorder } },
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

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

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
      t: 's',
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder
        }
      }
    }))

    const rows: any[][] = [headerRow]

    const cellBorder = {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder
    }

    assignmentStore.unassignedGuestIds.forEach(guestId => {
      const guest = guestStore.getGuestById(guestId)
      if (!guest) return

      rows.push([
        { v: guest.firstName || '', t: 's', s: { border: cellBorder } },
        { v: guest.lastName || '', t: 's', s: { border: cellBorder } },
        { v: guest.preferredName || '', t: 's', s: { border: cellBorder } },
        { v: guest.gender || '', t: 's', s: { border: cellBorder } },
        { v: guest.age || '', t: 's', s: { border: cellBorder } },
        { v: guest.groupName || '', t: 's', s: { border: cellBorder } },
        { v: guest.lowerBunk ? 'Yes' : 'No', t: 's', s: { border: cellBorder } },
        { v: formatDateWithFullYear(guest.arrival), t: 's', s: { border: cellBorder } },
        { v: formatDateWithFullYear(guest.departure), t: 's', s: { border: cellBorder } },
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

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

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
