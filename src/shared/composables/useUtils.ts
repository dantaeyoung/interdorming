/**
 * General Utilities Composable
 * Provides common utility functions
 */

/**
 * Parse a date string as local midnight, avoiding the UTC timezone trap.
 * new Date("2025-12-01") parses as UTC midnight, which rolls back one day
 * in negative-offset timezones (e.g. US Eastern). This function parses
 * YYYY-MM-DD strings as local midnight instead.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  // Fallback: try native parsing but normalize to local midnight
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0)
  }
  return d
}

interface StayLike {
  arrival?: string | Date | null
  departure?: string | Date | null
}

/**
 * Returns true if either side has missing arrival or departure.
 * Per spec: missing dates = "always present" = conflicts with everything.
 */
function hasMissingDates(s: StayLike): boolean {
  return !s.arrival || !s.departure
}

function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return parseLocalDate(value)
}

/**
 * Two stays overlap iff the half-open intervals
 * [arrival, departure) overlap. Departure-day is treated as bed-available
 * (guest leaves morning) — so A departing 4/15 does NOT conflict with
 * B arriving 4/15.
 *
 * If either stay has missing arrival or departure, treat as "always present"
 * → returns true (conflict).
 */
export function staysOverlap(a: StayLike, b: StayLike): boolean {
  if (hasMissingDates(a) || hasMissingDates(b)) return true

  const aStart = toLocalDate(a.arrival as string | Date)
  const aEnd = toLocalDate(a.departure as string | Date)
  const bStart = toLocalDate(b.arrival as string | Date)
  const bEnd = toLocalDate(b.departure as string | Date)

  if (isNaN(aStart.getTime()) || isNaN(aEnd.getTime())) return true
  if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return true

  // Half-open: [start, end). Overlap iff aStart < bEnd AND bStart < aEnd.
  return aStart < bEnd && bStart < aEnd
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

/**
 * Normalize any recognizable date string into the canonical user-facing
 * format "Month DD, YYYY" (e.g. "May 15, 2026"). Used everywhere a
 * guest's arrival/departure is rendered so mixed input formats from
 * different CSVs don't show side-by-side.
 *
 * Returns the input unchanged if it can't be parsed.
 */
export function formatGuestDate(value: string | null | undefined): string {
  if (!value) return ''
  const s = String(value).trim()
  if (!s) return ''

  // Already in target format? Skip parsing.
  // Loose regex — accepts "May 15, 2026" or "May 5, 2026"
  if (/^[A-Za-z]+\s+\d{1,2},\s*\d{4}$/.test(s)) return s

  // YYYY-MM-DD via parseLocalDate (avoids UTC timezone trap)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const m = Number(isoMatch[2]) - 1
    const d = Number(isoMatch[3])
    const y = Number(isoMatch[1])
    if (m >= 0 && m < 12) return `${MONTH_NAMES[m]} ${d}, ${y}`
  }

  // "30-May-25" or "30-May-2025"
  const dmy = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    const parsed = new Date(`${dmy[2]} ${dmy[1]}, ${year}`)
    if (!isNaN(parsed.getTime())) {
      return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`
    }
  }

  // Fallback: native Date parsing — handles "Apr 29, 2026", "5/15/2026"
  const native = new Date(s)
  if (!isNaN(native.getTime()) && native.getFullYear() >= 2000) {
    return `${MONTH_NAMES[native.getMonth()]} ${native.getDate()}, ${native.getFullYear()}`
  }

  return s
}

/**
 * Like {@link formatGuestDate} but without the year — for compact
 * contexts (bed-slot date ranges) where the retreat year is obvious
 * from context. "May 30, 2026" → "May 30". Inputs without a trailing
 * year are returned as formatted by formatGuestDate.
 */
export function formatGuestDateShort(value: string | null | undefined): string {
  return formatGuestDate(value).replace(/,\s*\d{4}$/, '')
}

/**
 * Returns true if the View Date falls within a stay (inclusive of arrival,
 * exclusive of departure). Used to pick which assignment to display in a
 * bed when the operator has a date filter active.
 *
 * Stays with missing dates are considered to cover every date.
 */
export function stayCoversDate(stay: StayLike, date: Date): boolean {
  if (hasMissingDates(stay)) return true
  const start = toLocalDate(stay.arrival as string | Date)
  const end = toLocalDate(stay.departure as string | Date)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return true
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return target >= start && target < end
}

export function useUtils() {
  /**
   * Creates a display name from first name and preferred name
   */
  function createDisplayName(person: {
    firstName?: string
    preferredName?: string
  }): string {
    if (!person) return ''

    const preferred = person.preferredName || ''
    const first = person.firstName || ''

    if (preferred && preferred !== first) {
      return `${preferred} (${first})`
    }

    return preferred || first
  }

  /**
   * Creates a full display name (firstName + lastName)
   * For room assignments where full name is needed
   */
  function createFullName(person: {
    firstName?: string
    lastName?: string
    preferredName?: string
  }): string {
    if (!person) return ''

    const first = person.firstName || ''
    const last = person.lastName || ''
    const preferred = person.preferredName || ''

    // If there's a preferred name different from first name, show it
    if (preferred && preferred !== first) {
      return `${preferred} ${last}`.trim()
    }

    return `${first} ${last}`.trim()
  }

  /**
   * Formats a date value for display
   */
  function formatDate(dateValue: string | Date): string {
    if (!dateValue) return ''

    const date = new Date(dateValue)
    if (isNaN(date.getTime())) {
      return String(dateValue) // Return original if not a valid date
    }

    return date.toLocaleDateString()
  }

  /**
   * Checks if a string is empty or contains only whitespace
   */
  function isEmptyOrWhitespace(str: string | null | undefined): boolean {
    return !str || !str.toString().trim()
  }

  /**
   * Truncates text to specified length with ellipsis
   */
  function truncateText(text: string, maxLength: number): string {
    if (!text) return ''

    const str = text.toString()
    if (str.length <= maxLength) return str

    return str.substring(0, maxLength - 3) + '...'
  }

  /**
   * Capitalizes the first letter of a string
   */
  function capitalizeFirst(str: string): string {
    if (!str) return ''

    const text = str.toString()
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  /**
   * Converts a string to title case
   */
  function toTitleCase(str: string): string {
    if (!str) return ''

    return str
      .toString()
      .split(' ')
      .map(word => capitalizeFirst(word))
      .join(' ')
  }

  /**
   * Deep clones an object using JSON serialization
   */
  function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj

    try {
      return JSON.parse(JSON.stringify(obj))
    } catch (error) {
      console.warn('Deep clone failed, returning original object:', error)
      return obj
    }
  }

  /**
   * Validates if a value is a valid email address
   */
  function isValidEmail(email: string): boolean {
    if (!email) return false

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.toString().trim())
  }

  return {
    createDisplayName,
    createFullName,
    formatDate,
    isEmptyOrWhitespace,
    truncateText,
    capitalizeFirst,
    toTitleCase,
    deepClone,
    isValidEmail,
  }
}
