/**
 * General Utilities Composable
 * Provides common utility functions
 */

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
    formatDate,
    isEmptyOrWhitespace,
    truncateText,
    capitalizeFirst,
    toTitleCase,
    deepClone,
    isValidEmail,
  }
}
