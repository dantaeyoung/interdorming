/**
 * Guest Store
 * Manages all guest data and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Guest, GuestInput } from '@/types'

export const useGuestStore = defineStore(
  'guests',
  () => {
    // State
    const guests = ref<Guest[]>([])
    const searchQuery = ref('')
    const sortColumn = ref<keyof Guest | null>(null)
    const sortDirection = ref<'asc' | 'desc'>('asc')

    // Getters
    const getGuestById = computed(() => {
      return (guestId: string) => guests.value.find(g => g.id === guestId)
    })

    const guestsByGroup = computed(() => {
      const groups = new Map<string, Guest[]>()
      guests.value.forEach(guest => {
        if (guest.groupName && guest.groupName.trim()) {
          const groupName = guest.groupName
          if (!groups.has(groupName)) {
            groups.set(groupName, [])
          }
          groups.get(groupName)!.push(guest)
        }
      })
      return groups
    })

    const unassignedGuests = computed(() => {
      // This will be populated by assignment store
      // For now, return all guests
      return guests.value
    })

    const filteredGuests = computed(() => {
      let filtered = guests.value

      // Apply search filter
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(
          g =>
            g.firstName.toLowerCase().includes(query) ||
            g.lastName.toLowerCase().includes(query) ||
            (g.preferredName && g.preferredName.toLowerCase().includes(query)) ||
            (g.groupName && g.groupName.toLowerCase().includes(query))
        )
      }

      // Apply sorting
      if (sortColumn.value) {
        filtered = [...filtered].sort((a, b) => {
          const aVal = a[sortColumn.value!]
          const bVal = b[sortColumn.value!]

          if (aVal === undefined || aVal === null) return 1
          if (bVal === undefined || bVal === null) return -1

          let comparison = 0
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal)
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal
          } else {
            comparison = String(aVal).localeCompare(String(bVal))
          }

          return sortDirection.value === 'asc' ? comparison : -comparison
        })
      }

      return filtered
    })

    // Actions
    function addGuest(guestInput: GuestInput) {
      const guest: Guest = {
        ...guestInput,
        id: generateGuestId(),
      }
      guests.value.push(guest)
      return guest
    }

    function updateGuest(guestId: string, updates: Partial<GuestInput>) {
      const index = guests.value.findIndex(g => g.id === guestId)
      if (index !== -1) {
        guests.value[index] = { ...guests.value[index], ...updates }
      }
    }

    function deleteGuest(guestId: string) {
      const index = guests.value.findIndex(g => g.id === guestId)
      if (index !== -1) {
        guests.value.splice(index, 1)
      }
    }

    function importGuests(importedGuests: Guest[]) {
      guests.value = importedGuests
    }

    function clearAllGuests() {
      guests.value = []
    }

    function setSearchQuery(query: string) {
      searchQuery.value = query
    }

    function setSortColumn(column: keyof Guest | null) {
      if (sortColumn.value === column) {
        // Toggle sort direction if same column
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortColumn.value = column
        sortDirection.value = 'asc'
      }
    }

    // Utility: Generate unique guest ID
    function generateGuestId(): string {
      return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    return {
      // State
      guests,
      searchQuery,
      sortColumn,
      sortDirection,

      // Getters
      getGuestById,
      guestsByGroup,
      unassignedGuests,
      filteredGuests,

      // Actions
      addGuest,
      updateGuest,
      deleteGuest,
      importGuests,
      clearAllGuests,
      setSearchQuery,
      setSortColumn,
    }
  },
  {
    persist: {
      key: 'dormAssignments-guests',
      paths: ['guests'],
    },
  }
)
