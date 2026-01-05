/**
 * Sort Configuration Composable
 * Manages multi-level sorting for guest data with persistence
 */

import { ref, computed, watch } from 'vue'
import type { Guest } from '@/types'

export type SortDirection = 'asc' | 'desc'

export type SortableField =
  | 'firstName'
  | 'lastName'
  | 'preferredName'
  | 'gender'
  | 'age'
  | 'groupName'
  | 'arrival'
  | 'departure'
  | 'retreat'
  | 'ratePerNight'
  | 'priceQuoted'
  | 'amountPaid'
  | 'importOrder'

export interface SortLevel {
  id: string
  field: SortableField
  direction: SortDirection
}

export interface SortFieldOption {
  value: SortableField
  label: string
  type: 'string' | 'number' | 'date' | 'money'
}

export const SORT_FIELD_OPTIONS: SortFieldOption[] = [
  { value: 'firstName', label: 'First Name', type: 'string' },
  { value: 'lastName', label: 'Last Name', type: 'string' },
  { value: 'preferredName', label: 'Preferred Name', type: 'string' },
  { value: 'gender', label: 'Gender', type: 'string' },
  { value: 'age', label: 'Age', type: 'number' },
  { value: 'groupName', label: 'Group Name', type: 'string' },
  { value: 'arrival', label: 'Arrival Date', type: 'date' },
  { value: 'departure', label: 'Departure Date', type: 'date' },
  { value: 'retreat', label: 'Retreat', type: 'string' },
  { value: 'ratePerNight', label: 'Rate Per Night', type: 'money' },
  { value: 'priceQuoted', label: 'Price Quoted', type: 'money' },
  { value: 'amountPaid', label: 'Amount Paid', type: 'money' },
  { value: 'importOrder', label: 'Import Order', type: 'number' },
]

const STORAGE_KEY = 'dormAssignments-sortConfig'

// Singleton state
const sortLevels = ref<SortLevel[]>([])
let initialized = false

/**
 * Generate a unique ID for sort levels
 */
function generateId(): string {
  return `sort-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load sort config from localStorage
 */
function loadFromStorage(): SortLevel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to load sort config from storage:', e)
  }
  return []
}

/**
 * Save sort config to localStorage
 */
function saveToStorage(levels: SortLevel[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
  } catch (e) {
    console.warn('Failed to save sort config to storage:', e)
  }
}

/**
 * Parse a value based on its field type
 */
function parseValue(value: any, fieldType: 'string' | 'number' | 'date' | 'money'): any {
  if (value === null || value === undefined || value === '') {
    // Return a value that will sort to the end
    switch (fieldType) {
      case 'number':
      case 'money':
        return Number.MAX_SAFE_INTEGER
      case 'date':
        return new Date(8640000000000000) // Max date
      default:
        return '\uffff' // High unicode char for string sorting
    }
  }

  switch (fieldType) {
    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(String(value))
      return isNaN(num) ? Number.MAX_SAFE_INTEGER : num

    case 'money':
      // Remove currency symbols, commas, etc.
      const moneyStr = String(value).replace(/[$,]/g, '').trim()
      const money = parseFloat(moneyStr)
      return isNaN(money) ? Number.MAX_SAFE_INTEGER : money

    case 'date':
      const date = new Date(value)
      return isNaN(date.getTime()) ? new Date(8640000000000000) : date

    default:
      return String(value).toLowerCase()
  }
}

/**
 * Compare two values based on field type and direction
 */
function compareValues(
  a: any,
  b: any,
  fieldType: 'string' | 'number' | 'date' | 'money',
  direction: SortDirection
): number {
  const parsedA = parseValue(a, fieldType)
  const parsedB = parseValue(b, fieldType)

  let result: number

  if (fieldType === 'date') {
    result = parsedA.getTime() - parsedB.getTime()
  } else if (fieldType === 'number' || fieldType === 'money') {
    result = parsedA - parsedB
  } else {
    result = parsedA.localeCompare(parsedB)
  }

  return direction === 'asc' ? result : -result
}

/**
 * Sort config composable - provides multi-level sorting for guests
 */
export function useSortConfig() {
  // Initialize from storage on first use
  if (!initialized) {
    sortLevels.value = loadFromStorage()
    initialized = true

    // Watch for changes and persist
    watch(sortLevels, (newLevels) => {
      saveToStorage(newLevels)
    }, { deep: true })
  }

  /**
   * Add a new sort level
   */
  function addLevel(field: SortableField = 'lastName', direction: SortDirection = 'asc') {
    sortLevels.value.push({
      id: generateId(),
      field,
      direction,
    })
  }

  /**
   * Remove a sort level by id
   */
  function removeLevel(id: string) {
    const index = sortLevels.value.findIndex(level => level.id === id)
    if (index !== -1) {
      sortLevels.value.splice(index, 1)
    }
  }

  /**
   * Update a sort level
   */
  function updateLevel(id: string, updates: Partial<Omit<SortLevel, 'id'>>) {
    const level = sortLevels.value.find(l => l.id === id)
    if (level) {
      if (updates.field !== undefined) level.field = updates.field
      if (updates.direction !== undefined) level.direction = updates.direction
    }
  }

  /**
   * Move a sort level up in priority
   */
  function moveLevelUp(id: string) {
    const index = sortLevels.value.findIndex(level => level.id === id)
    if (index > 0) {
      const temp = sortLevels.value[index]
      sortLevels.value[index] = sortLevels.value[index - 1]
      sortLevels.value[index - 1] = temp
    }
  }

  /**
   * Move a sort level down in priority
   */
  function moveLevelDown(id: string) {
    const index = sortLevels.value.findIndex(level => level.id === id)
    if (index < sortLevels.value.length - 1) {
      const temp = sortLevels.value[index]
      sortLevels.value[index] = sortLevels.value[index + 1]
      sortLevels.value[index + 1] = temp
    }
  }

  /**
   * Clear all sort levels
   */
  function clearAllLevels() {
    sortLevels.value = []
  }

  /**
   * Apply sort configuration to an array of guests
   */
  function sortGuests(guests: Guest[]): Guest[] {
    if (sortLevels.value.length === 0) {
      return guests
    }

    return [...guests].sort((a, b) => {
      for (const level of sortLevels.value) {
        const fieldOption = SORT_FIELD_OPTIONS.find(opt => opt.value === level.field)
        const fieldType = fieldOption?.type || 'string'

        const valueA = a[level.field as keyof Guest]
        const valueB = b[level.field as keyof Guest]

        const result = compareValues(valueA, valueB, fieldType, level.direction)

        if (result !== 0) {
          return result
        }
      }
      return 0
    })
  }

  /**
   * Check if sorting is active
   */
  const hasSortLevels = computed(() => sortLevels.value.length > 0)

  /**
   * Get human-readable sort description
   */
  const sortDescription = computed(() => {
    if (sortLevels.value.length === 0) {
      return 'No sorting applied'
    }

    return sortLevels.value.map(level => {
      const fieldOption = SORT_FIELD_OPTIONS.find(opt => opt.value === level.field)
      const fieldLabel = fieldOption?.label || level.field
      const dirLabel = level.direction === 'asc' ? '↑' : '↓'
      return `${fieldLabel} ${dirLabel}`
    }).join(', ')
  })

  return {
    sortLevels,
    addLevel,
    removeLevel,
    updateLevel,
    moveLevelUp,
    moveLevelDown,
    clearAllLevels,
    sortGuests,
    hasSortLevels,
    sortDescription,
    SORT_FIELD_OPTIONS,
  }
}
