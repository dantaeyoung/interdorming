/**
 * Guest Store
 * Manages all guest data and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Guest, GuestInput } from '@/types'
import { useSortConfig } from '@/shared/composables/useSortConfig'

export const useGuestStore = defineStore(
  'guests',
  () => {
    // State
    const guests = ref<Guest[]>([])
    const searchQuery = ref('')

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

    // Get sortGuests from useSortConfig composable
    const { sortGuests } = useSortConfig()

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

      // Apply multi-level custom sort from useSortConfig
      filtered = sortGuests(filtered)

      return filtered
    })

    // Actions
    function addGuest(guestInput: GuestInput) {
      // Find the highest import order and add 1
      const maxImportOrder = guests.value.reduce((max, g) =>
        Math.max(max, g.importOrder || 0), 0)

      const guest: Guest = {
        ...guestInput,
        id: generateGuestId(),
        importOrder: maxImportOrder + 1,
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
      // Assign import order to each guest (1-indexed)
      guests.value = importedGuests.map((guest, index) => ({
        ...guest,
        importOrder: index + 1
      }))
    }

    function clearAllGuests() {
      guests.value = []
    }

    function setSearchQuery(query: string) {
      searchQuery.value = query
    }

    // Utility: Generate unique guest ID
    function generateGuestId(): string {
      return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    return {
      // State
      guests,
      searchQuery,

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
    }
  },
  {
    persist: {
      key: 'dormAssignments-guests',
      paths: ['guests'],
    },
  }
)
