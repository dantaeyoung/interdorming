/**
 * Guest Store
 * Manages all guest data and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Guest, GuestInput } from '@/types'
import { useSortConfig } from '@/shared/composables/useSortConfig'
import { generateGroupNameFromMembers } from '@/features/guests/composables/useGroupLinking'

export const useGuestStore = defineStore(
  'guests',
  () => {
    // State
    const guests = ref<Guest[]>([])
    const searchQuery = ref('')

    // Ephemeral suggestion state (not persisted)
    const suggestedGroups = ref<Map<string, Set<string>>>(new Map())

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
      suggestedGroups.value = new Map()
    }

    function clearAllGuests() {
      guests.value = []
      suggestedGroups.value = new Map()
    }

    function setSearchQuery(query: string) {
      searchQuery.value = query
    }

    // Group suggestion computeds
    const hasGuestsWithEmail = computed(() =>
      guests.value.some(g => g.email && g.email.trim())
    )

    const hasGroupSuggestions = computed(() => suggestedGroups.value.size > 0)
    const groupSuggestionCount = computed(() => suggestedGroups.value.size)

    // Group suggestion actions
    function suggestGroupsByEmail(): number {
      const emailMap = new Map<string, Guest[]>()

      // Build email → guests map
      guests.value.forEach(guest => {
        if (guest.email && guest.email.trim()) {
          const normalizedEmail = guest.email.trim().toLowerCase()
          if (!emailMap.has(normalizedEmail)) {
            emailMap.set(normalizedEmail, [])
          }
          emailMap.get(normalizedEmail)!.push(guest)
        }
      })

      const newSuggestions = new Map<string, Set<string>>()

      emailMap.forEach((emailGuests) => {
        if (emailGuests.length < 2) return

        // Check existing group status
        const existingGroups = new Map<string, Guest[]>()
        const ungrouped: Guest[] = []

        emailGuests.forEach(guest => {
          if (guest.groupName && guest.groupName.trim()) {
            const gn = guest.groupName
            if (!existingGroups.has(gn)) {
              existingGroups.set(gn, [])
            }
            existingGroups.get(gn)!.push(guest)
          } else {
            ungrouped.push(guest)
          }
        })

        const existingGroupNames = Array.from(existingGroups.keys())

        // All share same group already → skip
        if (existingGroupNames.length === 1 && ungrouped.length === 0) return

        let suggestedName: string

        if (existingGroupNames.length === 0) {
          // None grouped → generate name
          suggestedName = generateGroupNameFromMembers(emailGuests.map(g => g.lastName))
        } else if (existingGroupNames.length === 1 && ungrouped.length > 0) {
          // Some grouped under one name, some not → suggest adding to existing group
          suggestedName = existingGroupNames[0]
        } else {
          // Multiple existing groups or mix → suggest merge under alphabetically first name
          existingGroupNames.sort((a, b) => a.localeCompare(b))
          suggestedName = existingGroupNames[0]
        }

        // Merge members if the same suggested name already exists
        const memberIds = new Set(emailGuests.map(g => g.id))
        if (newSuggestions.has(suggestedName)) {
          const existing = newSuggestions.get(suggestedName)!
          memberIds.forEach(id => existing.add(id))
        } else {
          newSuggestions.set(suggestedName, memberIds)
        }
      })

      suggestedGroups.value = newSuggestions
      return newSuggestions.size
    }

    function acceptGroupSuggestion(groupName: string) {
      const memberIds = suggestedGroups.value.get(groupName)
      if (!memberIds) return

      memberIds.forEach(id => {
        updateGuest(id, { groupName })
      })

      const newMap = new Map(suggestedGroups.value)
      newMap.delete(groupName)
      suggestedGroups.value = newMap
    }

    function rejectGroupSuggestion(groupName: string) {
      const newMap = new Map(suggestedGroups.value)
      newMap.delete(groupName)
      suggestedGroups.value = newMap
    }

    function acceptAllGroupSuggestions() {
      suggestedGroups.value.forEach((memberIds, groupName) => {
        memberIds.forEach(id => {
          updateGuest(id, { groupName })
        })
      })
      suggestedGroups.value = new Map()
    }

    function clearGroupSuggestions() {
      suggestedGroups.value = new Map()
    }

    // Utility: Generate unique guest ID
    function generateGuestId(): string {
      return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    return {
      // State
      guests,
      searchQuery,
      suggestedGroups,

      // Getters
      getGuestById,
      guestsByGroup,
      filteredGuests,
      hasGuestsWithEmail,
      hasGroupSuggestions,
      groupSuggestionCount,

      // Actions
      addGuest,
      updateGuest,
      deleteGuest,
      importGuests,
      clearAllGuests,
      setSearchQuery,
      suggestGroupsByEmail,
      acceptGroupSuggestion,
      rejectGroupSuggestion,
      acceptAllGroupSuggestions,
      clearGroupSuggestions,
    }
  },
  {
    persist: {
      key: 'dormAssignments-guests',
      paths: ['guests'],
    },
  }
)
