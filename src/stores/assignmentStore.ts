/**
 * Assignment Store
 * Manages guest-to-bed assignments and undo/redo history
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDormitoryStore } from './dormitoryStore'
import { useGuestStore } from './guestStore'
import { useAutoPlacement } from '@/features/assignments/composables/useAutoPlacement'
import type { AssignmentMap, HistoryState, SuggestedAssignmentMap } from '@/types'
import { HISTORY_SIZE } from '@/types'

export const useAssignmentStore = defineStore(
  'assignments',
  () => {
    // State
    const assignments = ref<AssignmentMap>(new Map())
    const suggestedAssignments = ref<SuggestedAssignmentMap>(new Map())
    const assignmentHistory = ref<HistoryState[]>([])
    const redoHistory = ref<HistoryState[]>([])
    const pickedUpGuestId = ref<string | null>(null)

    // Getters
    const getAssignmentByGuest = computed(() => {
      return (guestId: string): string | undefined => {
        return assignments.value.get(guestId)
      }
    })

    const getAssignmentByBed = computed(() => {
      return (bedId: string): string | undefined => {
        for (const [guestId, assignedBedId] of assignments.value.entries()) {
          if (assignedBedId === bedId) {
            return guestId
          }
        }
        return undefined
      }
    })

    const canUndo = computed(() => assignmentHistory.value.length > 0)
    const canRedo = computed(() => redoHistory.value.length > 0)

    const unassignedGuestIds = computed(() => {
      const guestStore = useGuestStore()
      return guestStore.guests.filter(g => !assignments.value.has(g.id)).map(g => g.id)
    })

    const assignedCount = computed(() => assignments.value.size)

    const unassignedCount = computed(() => {
      const guestStore = useGuestStore()
      return guestStore.guests.length - assignments.value.size
    })

    const hasSuggestions = computed(() => suggestedAssignments.value.size > 0)

    // Get all guests assigned to a specific bed
    function getGuestsAssignedToBed(bedId: string): string[] {
      const guests: string[] = []
      for (const [guestId, assignedBedId] of assignments.value.entries()) {
        if (assignedBedId === bedId) {
          guests.push(guestId)
        }
      }
      return guests
    }

    // Get all guests assigned to beds in a specific room
    function getGuestsAssignedToRoom(roomBedIds: string[]): string[] {
      const guests: string[] = []
      for (const [guestId, assignedBedId] of assignments.value.entries()) {
        if (roomBedIds.includes(assignedBedId)) {
          guests.push(guestId)
        }
      }
      return guests
    }

    // Get all guests assigned to beds in a specific dormitory
    function getGuestsAssignedToDormitory(dormitoryBedIds: string[]): string[] {
      const guests: string[] = []
      for (const [guestId, assignedBedId] of assignments.value.entries()) {
        if (dormitoryBedIds.includes(assignedBedId)) {
          guests.push(guestId)
        }
      }
      return guests
    }

    // Unassign all guests from a specific bed
    function unassignGuestsFromBed(bedId: string) {
      const guests = getGuestsAssignedToBed(bedId)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    // Unassign all guests from beds in a room
    function unassignGuestsFromRoom(roomBedIds: string[]) {
      const guests = getGuestsAssignedToRoom(roomBedIds)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    // Unassign all guests from beds in a dormitory
    function unassignGuestsFromDormitory(dormitoryBedIds: string[]) {
      const guests = getGuestsAssignedToDormitory(dormitoryBedIds)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    // Actions
    function assignGuestToBed(guestId: string, bedId: string, skipHistory = false) {
      const dormitoryStore = useDormitoryStore()

      // Save to history before making changes
      if (!skipHistory) {
        saveToHistory()
      }

      // Unassign from previous bed if assigned
      const existingBedId = assignments.value.get(guestId)
      if (existingBedId) {
        const existingBed = dormitoryStore.getBedById(existingBedId)
        if (existingBed) {
          existingBed.assignedGuestId = null
        }
      }

      // Clear any suggestion for this guest when manually assigned
      if (suggestedAssignments.value.has(guestId)) {
        suggestedAssignments.value.delete(guestId)
      }

      // Assign to new bed
      const bed = dormitoryStore.getBedById(bedId)
      if (bed) {
        bed.assignedGuestId = guestId
        assignments.value.set(guestId, bedId)
      }
    }

    function unassignGuest(guestId: string, skipHistory = false) {
      const dormitoryStore = useDormitoryStore()

      // Save to history before making changes
      if (!skipHistory) {
        saveToHistory()
      }

      const bedId = assignments.value.get(guestId)
      if (bedId) {
        const bed = dormitoryStore.getBedById(bedId)
        if (bed) {
          bed.assignedGuestId = null
        }
        assignments.value.delete(guestId)
      }
    }

    function swapGuests(guestId1: string, guestId2: string) {
      const dormitoryStore = useDormitoryStore()

      // Save to history before making changes
      saveToHistory()

      const bedId1 = assignments.value.get(guestId1)
      const bedId2 = assignments.value.get(guestId2)

      if (bedId1 && bedId2) {
        // Both assigned - swap
        const bed1 = dormitoryStore.getBedById(bedId1)
        const bed2 = dormitoryStore.getBedById(bedId2)

        if (bed1 && bed2) {
          bed1.assignedGuestId = guestId2
          bed2.assignedGuestId = guestId1
          assignments.value.set(guestId1, bedId2)
          assignments.value.set(guestId2, bedId1)
        }
      } else if (bedId1) {
        // Only first is assigned - move second to first's bed and unassign first
        unassignGuest(guestId1, true)
        assignGuestToBed(guestId2, bedId1, true)
      } else if (bedId2) {
        // Only second is assigned - move first to second's bed and unassign second
        unassignGuest(guestId2, true)
        assignGuestToBed(guestId1, bedId2, true)
      }
    }

    function clearAllAssignments() {
      const dormitoryStore = useDormitoryStore()

      saveToHistory()

      // Clear all bed assignments
      for (const bed of dormitoryStore.getAllBeds) {
        bed.assignedGuestId = null
      }

      assignments.value.clear()
    }

    function pickupGuest(guestId: string) {
      pickedUpGuestId.value = guestId
    }

    function dropPickedUpGuest() {
      pickedUpGuestId.value = null
    }

    function suggestAssignment(guestId: string, bedId: string) {
      suggestedAssignments.value.set(guestId, bedId)
    }

    function acceptSuggestion(guestId: string) {
      const bedId = suggestedAssignments.value.get(guestId)
      if (bedId) {
        assignGuestToBed(guestId, bedId)
        suggestedAssignments.value.delete(guestId)
      }
    }

    function acceptAllSuggestions() {
      saveToHistory()

      for (const [guestId, bedId] of suggestedAssignments.value.entries()) {
        assignGuestToBed(guestId, bedId, true)
      }

      suggestedAssignments.value.clear()
    }

    function clearSuggestions() {
      suggestedAssignments.value.clear()
    }

    function saveToHistory() {
      const dormitoryStore = useDormitoryStore()

      const state: HistoryState = {
        assignments: new Map(assignments.value),
        rooms: JSON.parse(JSON.stringify(dormitoryStore.getAllRooms)),
        dormitories: JSON.parse(JSON.stringify(dormitoryStore.dormitories)),
      }

      assignmentHistory.value.push(state)

      // Clear redo history when new action is taken
      redoHistory.value = []

      // Limit history size
      if (assignmentHistory.value.length > HISTORY_SIZE) {
        assignmentHistory.value.shift()
      }
    }

    function undo() {
      if (assignmentHistory.value.length === 0) return

      const dormitoryStore = useDormitoryStore()

      // Save current state to redo history before undoing
      const currentState: HistoryState = {
        assignments: new Map(assignments.value),
        rooms: JSON.parse(JSON.stringify(dormitoryStore.getAllRooms)),
        dormitories: JSON.parse(JSON.stringify(dormitoryStore.dormitories)),
      }
      redoHistory.value.push(currentState)

      const previousState = assignmentHistory.value.pop()!

      // Restore assignments
      assignments.value = new Map(previousState.assignments)

      // Restore dormitory structure
      if (previousState.dormitories) {
        dormitoryStore.importDormitories(
          JSON.parse(JSON.stringify(previousState.dormitories))
        )
      }
    }

    function redo() {
      if (redoHistory.value.length === 0) return

      const dormitoryStore = useDormitoryStore()

      // Save current state to undo history before redoing
      const currentState: HistoryState = {
        assignments: new Map(assignments.value),
        rooms: JSON.parse(JSON.stringify(dormitoryStore.getAllRooms)),
        dormitories: JSON.parse(JSON.stringify(dormitoryStore.dormitories)),
      }
      assignmentHistory.value.push(currentState)

      const nextState = redoHistory.value.pop()!

      // Restore assignments
      assignments.value = new Map(nextState.assignments)

      // Restore dormitory structure
      if (nextState.dormitories) {
        dormitoryStore.importDormitories(
          JSON.parse(JSON.stringify(nextState.dormitories))
        )
      }
    }

    function clearHistory() {
      assignmentHistory.value = []
      redoHistory.value = []
    }

    // Accept suggestions only for beds in a specific room
    function acceptSuggestionsForRoom(roomBedIds: string[]) {
      const suggestionsToAccept: [string, string][] = []

      for (const [guestId, bedId] of suggestedAssignments.value.entries()) {
        if (roomBedIds.includes(bedId)) {
          suggestionsToAccept.push([guestId, bedId])
        }
      }

      if (suggestionsToAccept.length === 0) return

      saveToHistory()

      for (const [guestId, bedId] of suggestionsToAccept) {
        assignGuestToBed(guestId, bedId, true)
        suggestedAssignments.value.delete(guestId)
      }
    }

    // Get count of suggestions for a specific room
    function getSuggestionsCountForRoom(roomBedIds: string[]): number {
      let count = 0
      for (const [, bedId] of suggestedAssignments.value.entries()) {
        if (roomBedIds.includes(bedId)) {
          count++
        }
      }
      return count
    }

    // Auto-placement using weighted scoring algorithm
    function autoPlace() {
      const { autoPlaceGuests } = useAutoPlacement()

      // Clear existing suggestions
      suggestedAssignments.value.clear()

      // Run auto-placement algorithm
      const suggestions = autoPlaceGuests()

      // Apply new suggestions
      suggestions.forEach((bedId, guestId) => {
        suggestedAssignments.value.set(guestId, bedId)
      })

      // Return placement results
      return {
        placedCount: suggestions.size,
        unplacedCount: unassignedGuestIds.value.length - suggestions.size,
      }
    }

    return {
      // State
      assignments,
      suggestedAssignments,
      assignmentHistory,
      pickedUpGuestId,

      // Getters
      getAssignmentByGuest,
      getAssignmentByBed,
      canUndo,
      canRedo,
      unassignedGuestIds,
      assignedCount,
      unassignedCount,
      hasSuggestions,

      // Actions
      assignGuestToBed,
      unassignGuest,
      swapGuests,
      clearAllAssignments,
      pickupGuest,
      dropPickedUpGuest,
      suggestAssignment,
      acceptSuggestion,
      acceptAllSuggestions,
      clearSuggestions,
      saveToHistory,
      undo,
      redo,
      clearHistory,
      autoPlace,
      acceptSuggestionsForRoom,
      getSuggestionsCountForRoom,
      getGuestsAssignedToBed,
      getGuestsAssignedToRoom,
      getGuestsAssignedToDormitory,
      unassignGuestsFromBed,
      unassignGuestsFromRoom,
      unassignGuestsFromDormitory,
    }
  },
  {
    persist: {
      key: 'dormAssignments-assignments',
      paths: ['assignments', 'assignmentHistory'],
      serializer: {
        serialize: state => {
          return JSON.stringify({
            assignments: Array.from(state.assignments.entries()),
            assignmentHistory: state.assignmentHistory.map(h => ({
              assignments: Array.from(h.assignments.entries()),
              rooms: h.rooms,
              dormitories: h.dormitories,
            })),
          })
        },
        deserialize: str => {
          const parsed = JSON.parse(str)
          return {
            assignments: new Map(parsed.assignments || []),
            assignmentHistory: (parsed.assignmentHistory || []).map((h: any) => ({
              assignments: new Map(h.assignments || []),
              rooms: h.rooms,
              dormitories: h.dormitories,
            })),
          }
        },
      },
    },
  }
)
