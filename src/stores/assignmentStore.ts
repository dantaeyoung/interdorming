/**
 * Assignment Store
 * Manages guest-to-bed assignments and undo/redo history.
 *
 * Data model: each bed holds an array of `BedAssignment`s. Multiple guests
 * may share the same bed as long as their stays don't overlap. The
 * `assignments` Map (guestId → bedId) is a denormalized lookup that stays
 * single-valued (one bed per guest stay) and must be kept in sync with the
 * bed-level assignments arrays.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDormitoryStore } from './dormitoryStore'
import { useGuestStore } from './guestStore'
import { useAutoPlacement } from '@/features/assignments/composables/useAutoPlacement'
import type { UnplaceableGroup } from '@/features/assignments/composables/useAutoPlacement'
import { staysOverlap, stayCoversDate } from '@/shared/composables/useUtils'
import type {
  AssignmentMap,
  HistoryState,
  SuggestedAssignmentMap,
  Bed,
  Guest,
} from '@/types'
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
    const unplaceableGroups = ref<UnplaceableGroup[]>([])

    // Getters
    const getAssignmentByGuest = computed(() => {
      return (guestId: string): string | undefined => {
        return assignments.value.get(guestId)
      }
    })

    /**
     * Reverse lookup: bedId → guestId[] (all guests assigned to that bed,
     * regardless of date overlap). Use `getActiveGuestForBed` if you need
     * the single guest visible at a specific date.
     */
    const bedToGuestsMap = computed(() => {
      const map = new Map<string, string[]>()
      for (const [guestId, bedId] of assignments.value.entries()) {
        const list = map.get(bedId)
        if (list) list.push(guestId)
        else map.set(bedId, [guestId])
      }
      return map
    })

    const suggestedBedToGuestMap = computed(() => {
      const map = new Map<string, string>()
      for (const [guestId, bedId] of suggestedAssignments.value.entries()) {
        map.set(bedId, guestId)
      }
      return map
    })

    /**
     * Returns all guestIds assigned to the given bed (any date). Empty array
     * if the bed has no assignments.
     */
    const getGuestsAtBed = computed(() => {
      return (bedId: string): string[] => {
        return bedToGuestsMap.value.get(bedId) ?? []
      }
    })

    /**
     * Picks the single guest whose stay covers `date`. If multiple match
     * (shouldn't happen if conflicts are resolved), returns the first.
     * Returns undefined if no guest covers the date.
     */
    const getActiveGuestForBed = computed(() => {
      const guestStore = useGuestStore()
      return (bedId: string, date: Date): string | undefined => {
        const guestIds = bedToGuestsMap.value.get(bedId)
        if (!guestIds || guestIds.length === 0) return undefined
        for (const id of guestIds) {
          const guest = guestStore.guests.find(g => g.id === id)
          if (guest && stayCoversDate(guest, date)) return id
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

    // ----- Bed-state helpers (multi-assignment aware) -----

    function getGuestsAssignedToBed(bedId: string): string[] {
      return bedToGuestsMap.value.get(bedId) ?? []
    }

    function getGuestsAssignedToRoom(roomBedIds: string[]): string[] {
      const bedIdSet = new Set(roomBedIds)
      const guests: string[] = []
      for (const [guestId, assignedBedId] of assignments.value.entries()) {
        if (bedIdSet.has(assignedBedId)) {
          guests.push(guestId)
        }
      }
      return guests
    }

    function getGuestsAssignedToDormitory(dormitoryBedIds: string[]): string[] {
      const bedIdSet = new Set(dormitoryBedIds)
      const guests: string[] = []
      for (const [guestId, assignedBedId] of assignments.value.entries()) {
        if (bedIdSet.has(assignedBedId)) {
          guests.push(guestId)
        }
      }
      return guests
    }

    /**
     * Returns the guestIds of existing assignments on `bedId` whose stays
     * overlap with the given guest's stay. Used by callers to detect
     * conflicts before dropping.
     */
    function getOverlappingAssignments(
      bedId: string,
      candidateGuest: Guest
    ): string[] {
      const dormitoryStore = useDormitoryStore()
      const guestStore = useGuestStore()
      const bed = dormitoryStore.getBedById(bedId)
      if (!bed) return []
      const overlapping: string[] = []
      for (const a of bed.assignments) {
        if (a.guestId === candidateGuest.id) continue
        const other = guestStore.guests.find(g => g.id === a.guestId)
        if (!other) continue
        if (staysOverlap(other, candidateGuest)) {
          overlapping.push(a.guestId)
        }
      }
      return overlapping
    }

    /**
     * Scan every bed for overlapping assignments and return them grouped
     * by bed. Used by the post-CSV-import conflict modal and by the
     * `dateOverlap` validation warning.
     */
    function getAllOverlapConflicts(): Array<{
      bedId: string
      guests: { guestId: string; arrival?: string; departure?: string }[]
    }> {
      const dormitoryStore = useDormitoryStore()
      const guestStore = useGuestStore()
      const results: Array<{
        bedId: string
        guests: { guestId: string; arrival?: string; departure?: string }[]
      }> = []
      for (const bed of dormitoryStore.getAllBeds) {
        if (bed.assignments.length < 2) continue
        // Find any pair (i, j) with overlap. If at least one pair overlaps,
        // include all guests on the bed in the report (operator picks
        // which to keep).
        const guests = bed.assignments
          .map(a => guestStore.guests.find(g => g.id === a.guestId))
          .filter((g): g is Guest => g !== undefined)
        let hasOverlap = false
        for (let i = 0; i < guests.length; i++) {
          for (let j = i + 1; j < guests.length; j++) {
            if (staysOverlap(guests[i], guests[j])) {
              hasOverlap = true
              break
            }
          }
          if (hasOverlap) break
        }
        if (hasOverlap) {
          results.push({
            bedId: bed.bedId,
            guests: guests.map(g => ({
              guestId: g.id,
              arrival: g.arrival,
              departure: g.departure,
            })),
          })
        }
      }
      return results
    }

    function unassignGuestsFromBed(bedId: string) {
      const guests = getGuestsAssignedToBed(bedId)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    function unassignGuestsFromRoom(roomBedIds: string[]) {
      const guests = getGuestsAssignedToRoom(roomBedIds)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    function unassignGuestsFromDormitory(dormitoryBedIds: string[]) {
      const guests = getGuestsAssignedToDormitory(dormitoryBedIds)
      guests.forEach(guestId => unassignGuest(guestId, true))
    }

    // ----- Mutation primitives -----

    function _removeGuestFromBed(bed: Bed, guestId: string) {
      const idx = bed.assignments.findIndex(a => a.guestId === guestId)
      if (idx !== -1) bed.assignments.splice(idx, 1)
    }

    function _addGuestToBed(bed: Bed, guestId: string) {
      if (!bed.assignments.some(a => a.guestId === guestId)) {
        bed.assignments.push({ guestId })
      }
    }

    /**
     * Assign a guest to a bed.
     *
     * - If the guest is already on another bed, they're removed from there
     *   (one bed per guest stay).
     * - If `displaceOverlapping` is true, any existing assignments on the
     *   target bed whose stays overlap the new guest's stay are removed
     *   (and those guests become unassigned). When false (default), the
     *   caller is responsible for resolving conflicts beforehand — typically
     *   via the confirm dialog.
     */
    function assignGuestToBed(
      guestId: string,
      bedId: string,
      skipHistory = false,
      displaceOverlapping = false
    ) {
      const dormitoryStore = useDormitoryStore()
      const guestStore = useGuestStore()

      const bed = dormitoryStore.getBedById(bedId)
      if (!bed) return

      if (!skipHistory) {
        saveToHistory()
      }

      // Remove guest from previous bed if they had one.
      const existingBedId = assignments.value.get(guestId)
      if (existingBedId && existingBedId !== bedId) {
        const existingBed = dormitoryStore.getBedById(existingBedId)
        if (existingBed) _removeGuestFromBed(existingBed, guestId)
      }

      // Optionally displace overlapping assignments on the target bed.
      if (displaceOverlapping) {
        const candidateGuest = guestStore.guests.find(g => g.id === guestId)
        if (candidateGuest) {
          const toRemove: string[] = []
          for (const a of bed.assignments) {
            if (a.guestId === guestId) continue
            const other = guestStore.guests.find(g => g.id === a.guestId)
            if (other && staysOverlap(other, candidateGuest)) {
              toRemove.push(a.guestId)
            }
          }
          for (const otherId of toRemove) {
            _removeGuestFromBed(bed, otherId)
            assignments.value.delete(otherId)
          }
        }
      }

      // Clear any suggestion for this guest when manually assigned.
      if (suggestedAssignments.value.has(guestId)) {
        suggestedAssignments.value.delete(guestId)
      }

      _addGuestToBed(bed, guestId)
      assignments.value.set(guestId, bedId)
    }

    function unassignGuest(guestId: string, skipHistory = false) {
      const dormitoryStore = useDormitoryStore()

      if (!skipHistory) {
        saveToHistory()
      }

      const bedId = assignments.value.get(guestId)
      if (bedId) {
        const bed = dormitoryStore.getBedById(bedId)
        if (bed) _removeGuestFromBed(bed, guestId)
        assignments.value.delete(guestId)
      }
    }

    /**
     * Swap two guests' bed assignments. Both must already be assigned. If
     * only one is assigned, the unassigned guest takes the other's bed and
     * the previously-assigned guest becomes unassigned.
     *
     * Note: this does NOT do overlap checks — callers should resolve
     * overlaps via the confirm dialog before invoking this. With date-aware
     * sharing, the more common pattern is `assignGuestToBed(g, b, false,
     * true)` to displace overlapping occupants rather than literal swap.
     */
    function swapGuests(guestId1: string, guestId2: string) {
      const dormitoryStore = useDormitoryStore()

      saveToHistory()

      const bedId1 = assignments.value.get(guestId1)
      const bedId2 = assignments.value.get(guestId2)

      if (bedId1 && bedId2) {
        const bed1 = dormitoryStore.getBedById(bedId1)
        const bed2 = dormitoryStore.getBedById(bedId2)
        if (bed1 && bed2) {
          _removeGuestFromBed(bed1, guestId1)
          _removeGuestFromBed(bed2, guestId2)
          _addGuestToBed(bed1, guestId2)
          _addGuestToBed(bed2, guestId1)
          assignments.value.set(guestId1, bedId2)
          assignments.value.set(guestId2, bedId1)
        }
      } else if (bedId1) {
        unassignGuest(guestId1, true)
        assignGuestToBed(guestId2, bedId1, true)
      } else if (bedId2) {
        unassignGuest(guestId2, true)
        assignGuestToBed(guestId1, bedId2, true)
      }
    }

    function clearAllAssignments() {
      const dormitoryStore = useDormitoryStore()

      saveToHistory()

      for (const bed of dormitoryStore.getAllBeds) {
        bed.assignments = []
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

      redoHistory.value = []

      if (assignmentHistory.value.length > HISTORY_SIZE) {
        assignmentHistory.value.shift()
      }
    }

    function undo() {
      if (assignmentHistory.value.length === 0) return

      const dormitoryStore = useDormitoryStore()

      const currentState: HistoryState = {
        assignments: new Map(assignments.value),
        rooms: JSON.parse(JSON.stringify(dormitoryStore.getAllRooms)),
        dormitories: JSON.parse(JSON.stringify(dormitoryStore.dormitories)),
      }
      redoHistory.value.push(currentState)

      const previousState = assignmentHistory.value.pop()!

      assignments.value = new Map(previousState.assignments)

      if (previousState.dormitories) {
        dormitoryStore.importDormitories(
          JSON.parse(JSON.stringify(previousState.dormitories))
        )
      }
    }

    function redo() {
      if (redoHistory.value.length === 0) return

      const dormitoryStore = useDormitoryStore()

      const currentState: HistoryState = {
        assignments: new Map(assignments.value),
        rooms: JSON.parse(JSON.stringify(dormitoryStore.getAllRooms)),
        dormitories: JSON.parse(JSON.stringify(dormitoryStore.dormitories)),
      }
      assignmentHistory.value.push(currentState)

      const nextState = redoHistory.value.pop()!

      assignments.value = new Map(nextState.assignments)

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

    function acceptSuggestionsForRoom(roomBedIds: string[]) {
      const suggestionsToAccept: [string, string][] = []

      for (const bedId of roomBedIds) {
        const guestId = suggestedBedToGuestMap.value.get(bedId)
        if (guestId) {
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

    function getSuggestionsCountForRoom(roomBedIds: string[]): number {
      let count = 0
      for (const bedId of roomBedIds) {
        if (suggestedBedToGuestMap.value.has(bedId)) {
          count++
        }
      }
      return count
    }

    function autoPlace() {
      const { autoPlaceGuests } = useAutoPlacement()

      suggestedAssignments.value.clear()
      unplaceableGroups.value = []

      const result = autoPlaceGuests()

      result.suggestions.forEach((bedId, guestId) => {
        suggestedAssignments.value.set(guestId, bedId)
      })

      unplaceableGroups.value = result.unplaceableGroups

      return {
        placedCount: result.suggestions.size,
        unplacedCount: unassignedGuestIds.value.length - result.suggestions.size,
        unplaceableGroups: result.unplaceableGroups,
      }
    }

    return {
      // State
      assignments,
      suggestedAssignments,
      assignmentHistory,
      pickedUpGuestId,
      unplaceableGroups,

      // Getters
      getAssignmentByGuest,
      bedToGuestsMap,
      suggestedBedToGuestMap,
      getGuestsAtBed,
      getActiveGuestForBed,
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
      getOverlappingAssignments,
      getAllOverlapConflicts,
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
