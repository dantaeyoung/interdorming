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
import type { Guest, Bed, FlatRoom } from '@/types'

export const useValidationStore = defineStore('validation', () => {
  // Getters
  const getWarningsForBed = computed(() => {
    return (bedId: string): string[] => {
      const guestStore = useGuestStore()
      const assignmentStore = useAssignmentStore()
      const dormitoryStore = useDormitoryStore()

      const guestId = assignmentStore.getAssignmentByBed(bedId)
      if (!guestId) return []

      const guest = guestStore.getGuestById(guestId)
      if (!guest) return []

      const bed = dormitoryStore.getBedById(bedId)
      if (!bed) return []

      const room = dormitoryStore.getRoomByBedId(bedId)
      if (!room) return []

      return getAssignmentWarnings(guest, bed, room)
    }
  })

  const getWarningsForGuest = computed(() => {
    return (guestId: string): string[] => {
      const guestStore = useGuestStore()
      const assignmentStore = useAssignmentStore()
      const dormitoryStore = useDormitoryStore()

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
    const assignmentStore = useAssignmentStore()

    for (const [guestId, bedId] of assignmentStore.assignments.entries()) {
      const bedWarnings = getWarningsForBed(bedId)
      if (bedWarnings.length > 0) {
        warnings[bedId] = bedWarnings
      }
    }

    return warnings
  })

  // Helper functions
  function getAssignmentWarnings(guest: Guest, bed: Bed, room: FlatRoom): string[] {
    const settingsStore = useSettingsStore()
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

    // Check for family/group separation warnings
    if (
      settingsStore.settings.warnings.familySeparation &&
      guest.groupName &&
      guest.groupName.trim()
    ) {
      const separatedCount = checkFamilySeparation(guest, room)
      if (separatedCount > 0) {
        warnings.push(`${separatedCount} group member(s) in other room(s)`)
      }
    }

    return warnings
  }

  function getUnassignedGuestWarnings(guestId: string): string[] {
    const guestStore = useGuestStore()
    const dormitoryStore = useDormitoryStore()
    const settingsStore = useSettingsStore()
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
      const hasAvailableBed = room.beds.some(bed => !bed.assignedGuestId)
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
            !bed.assignedGuestId &&
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
    const guestStore = useGuestStore()
    const assignmentStore = useAssignmentStore()
    const dormitoryStore = useDormitoryStore()

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
