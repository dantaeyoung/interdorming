/**
 * Validation Store
 * Validates guest assignments and generates warnings
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useGuestStore } from './guestStore'
import { useAssignmentStore } from './assignmentStore'
import { useDormitoryStore } from './dormitoryStore'
import { useSettingsStore } from './settingsStore'
import { staysOverlap } from '@/shared/composables/useUtils'
import type { Guest, Bed, FlatRoom } from '@/types'

export const useValidationStore = defineStore('validation', () => {
  // Initialize stores once at setup time (not inside computed)
  const guestStore = useGuestStore()
  const assignmentStore = useAssignmentStore()
  const dormitoryStore = useDormitoryStore()
  const settingsStore = useSettingsStore()

  // Getters
  /**
   * Warnings for a bed.
   *
   * A bed can hold multiple cohorts (date-aware sharing). Pass
   * `displayedGuestId` to scope warnings to the cohort currently shown
   * in the slot: gender/age/bunk warnings come only from that guest,
   * and date conflicts are reported only for stays that collide with
   * theirs. Without it (e.g. the global `getAllWarnings` scan) every
   * cohort on the bed is considered.
   *
   * Scoping matters because, e.g., a male guest sharing a bed with a
   * female guest in a non-overlapping cohort would otherwise surface
   * his "M guest in F room" warning on her slot.
   */
  const getWarningsForBed = computed(() => {
    return (bedId: string, displayedGuestId?: string): string[] => {
      const bed = dormitoryStore.getBedById(bedId)
      // Defensive: legacy beds might lack `assignments` until migration
      // finishes; treat as empty rather than crashing.
      const bedAssignments = bed?.assignments ?? []
      if (!bed || bedAssignments.length === 0) return []

      const room = dormitoryStore.getRoomByBedId(bedId)
      if (!room) return []

      const guests = bedAssignments
        .map(a => guestStore.getGuestById(a.guestId))
        .filter((g): g is Guest => g !== undefined)

      const displayedGuest = displayedGuestId
        ? guests.find(g => g.id === displayedGuestId)
        : undefined

      const warnings: string[] = []

      if (displayedGuest) {
        // Cohort-scoped: only the displayed guest's stay/room warnings.
        const overlappingNames: string[] = []
        for (const other of guests) {
          if (other === displayedGuest) continue
          if (staysOverlap(displayedGuest, other)) {
            const name = other.preferredName || other.firstName
            if (!overlappingNames.includes(name)) overlappingNames.push(name)
          }
        }
        if (overlappingNames.length > 0) {
          warnings.push(`Date conflict: overlaps with ${overlappingNames.join(', ')}`)
        }
        warnings.push(...getAssignmentWarnings(displayedGuest, bed, room))
        return warnings
      }

      // Unscoped: every cohort on the bed (used by getAllWarnings).
      const overlappingNames: string[] = []
      for (let i = 0; i < guests.length; i++) {
        for (let j = i + 1; j < guests.length; j++) {
          if (staysOverlap(guests[i], guests[j])) {
            const name = guests[j].preferredName || guests[j].firstName
            if (!overlappingNames.includes(name)) overlappingNames.push(name)
          }
        }
      }
      if (overlappingNames.length > 0) {
        warnings.push(`Date conflict: overlaps with ${overlappingNames.join(', ')}`)
      }

      const seen = new Set<string>()
      for (const guest of guests) {
        for (const w of getAssignmentWarnings(guest, bed, room)) {
          if (!seen.has(w)) {
            seen.add(w)
            warnings.push(w)
          }
        }
      }
      return warnings
    }
  })

  const getWarningsForGuest = computed(() => {
    return (guestId: string): string[] => {
      const bedId = assignmentStore.getAssignmentByGuest(guestId)
      if (!bedId) {
        return getUnassignedGuestWarnings(guestId)
      }

      const guest = guestStore.getGuestById(guestId)
      if (!guest) return []

      const bed = dormitoryStore.getBedById(bedId)
      if (!bed) return []

      const room = dormitoryStore.getRoomByBedId(bedId)
      if (!room) return []

      return getAssignmentWarnings(guest, bed, room)
    }
  })

  const getAllWarnings = computed(() => {
    const warnings: Record<string, string[]> = {}

    for (const [guestId, bedId] of assignmentStore.assignments.entries()) {
      const bedWarnings = getWarningsForBed.value(bedId)
      if (bedWarnings.length > 0) {
        warnings[bedId] = bedWarnings
      }
    }

    return warnings
  })

  // Helper functions
  function getAssignmentWarnings(guest: Guest, bed: Bed, room: FlatRoom): string[] {
    const warnings: string[] = []

    // Check gender mismatch warnings (non-binary guests don't trigger warnings)
    if (
      settingsStore.settings.warnings.genderMismatch &&
      guest.gender !== room.roomGender &&
      room.roomGender !== 'Coed' &&
      guest.gender !== 'Non-binary/Other'
    ) {
      warnings.push(`${guest.gender} guest in ${room.roomGender} room`)
    }

    // Check bunk preference violations
    if (
      settingsStore.settings.warnings.bunkPreference &&
      guest.lowerBunk &&
      bed.bedType === 'upper'
    ) {
      warnings.push('Needs Lower Bunk')
    }

    // Check for family/group separation warnings - DISABLED
    // if (
    //   settingsStore.settings.warnings.familySeparation &&
    //   guest.groupName &&
    //   guest.groupName.trim()
    // ) {
    //   const separatedCount = checkFamilySeparation(guest, room)
    //   if (separatedCount > 0) {
    //     warnings.push(`${separatedCount} group member(s) in other room(s)`)
    //   }
    // }

    return warnings
  }

  function getUnassignedGuestWarnings(guestId: string): string[] {
    const warnings: string[] = []

    if (!settingsStore.settings.warnings.roomAvailability) {
      return warnings
    }

    const guest = guestStore.getGuestById(guestId)
    if (!guest) return warnings

    const availableRooms = dormitoryStore.getAllRooms

    // Check if there are any compatible rooms
    const hasCompatibleRoom = availableRooms.some(room => {
      // Check gender compatibility (non-binary guests can go in any room)
      if (
        guest.gender !== 'Non-binary/Other' &&
        room.roomGender !== 'Coed' &&
        room.roomGender !== guest.gender
      ) {
        return false
      }
      // Check if room has available beds
      const hasAvailableBed = room.beds.some(bed => bed.assignments.length === 0)
      return hasAvailableBed
    })

    if (!hasCompatibleRoom) {
      warnings.push('No compatible rooms available')
    }

    // Check for lower bunk requirement
    if (guest.lowerBunk) {
      const hasLowerBunk = availableRooms.some(room => {
        // Non-binary guests can use any room
        const isRoomCompatible =
          guest.gender === 'Non-binary/Other' ||
          room.roomGender === 'Coed' ||
          room.roomGender === guest.gender

        return room.beds.some(
          bed =>
            bed.assignments.length === 0 &&
            (bed.bedType === 'lower' || bed.bedType === 'single') &&
            isRoomCompatible
        )
      })

      if (!hasLowerBunk) {
        warnings.push('No lower/single bunks available in compatible rooms')
      }
    }

    return warnings
  }

  function checkFamilySeparation(guest: Guest, currentRoom: FlatRoom): number {
    if (!guest.groupName || !guest.groupName.trim()) {
      return 0
    }

    const groupMembers = guestStore.guests.filter(
      g => g.groupName === guest.groupName && g.id !== guest.id
    )

    const separatedMembers = groupMembers.filter(member => {
      const memberBedId = assignmentStore.getAssignmentByGuest(member.id)
      if (!memberBedId) return false // Not assigned yet

      const memberRoom = dormitoryStore.getRoomByBedId(memberBedId)
      return memberRoom && memberRoom.roomName !== currentRoom.roomName
    })

    return separatedMembers.length
  }

  return {
    // Getters
    getWarningsForBed,
    getWarningsForGuest,
    getAllWarnings,
  }
})
