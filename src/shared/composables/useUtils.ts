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
