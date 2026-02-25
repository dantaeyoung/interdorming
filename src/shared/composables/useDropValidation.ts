/**
 * Drop Validation Composable
 * Provides validation for guest-to-bed drops
 */

import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useGuestStore } from '@/stores/guestStore'
import type { Guest, Bed, FlatRoom } from '@/types'

export function useDropValidation() {
  const dormitoryStore = useDormitoryStore()
  const guestStore = useGuestStore()

  /**
   * Check if a guest can be validly placed in a bed
   * Returns { isValid: boolean, reason?: string }
   */
  function validateDrop(guestId: string, bedId: string): { isValid: boolean; reason?: string } {
    const guest = guestStore.getGuestById(guestId)
    if (!guest) {
      return { isValid: false, reason: 'Guest not found' }
    }

    const bed = dormitoryStore.getBedById(bedId)
    if (!bed) {
      return { isValid: false, reason: 'Bed not found' }
    }

    const room = dormitoryStore.getRoomByBedId(bedId)
    if (!room) {
      return { isValid: false, reason: 'Room not found' }
    }

    return validateGuestBedCompatibility(guest, bed, room)
  }

  /**
   * Check if a guest is compatible with a specific bed
   */
  function validateGuestBedCompatibility(
    guest: Guest,
    bed: Bed,
    room: FlatRoom
  ): { isValid: boolean; reason?: string } {
    // Check gender compatibility
    const genderValid = isGenderCompatible(guest, room)
    if (!genderValid) {
      return { isValid: false, reason: `${guest.gender} guest in ${room.roomGender} room` }
    }

    // Check bunk preference
    const bunkValid = isBunkCompatible(guest, bed)
    if (!bunkValid) {
      return { isValid: false, reason: 'Needs lower bunk' }
    }

    return { isValid: true }
  }

  /**
   * Check if guest gender is compatible with room
   */
  function isGenderCompatible(guest: Guest, room: FlatRoom): boolean {
    // Non-binary guests can go in any room
    if (guest.gender === 'Non-binary/Other') {
      return true
    }

    // Coed rooms accept any gender
    if (room.roomGender === 'Coed') {
      return true
    }

    // Check if guest gender matches room gender
    return guest.gender === room.roomGender
  }

  /**
   * Check if guest bunk preference is compatible with bed type
   */
  function isBunkCompatible(guest: Guest, bed: Bed): boolean {
    // If guest doesn't need lower bunk, any bed is fine
    if (!guest.lowerBunk) {
      return true
    }

    // Guest needs lower bunk - check bed type
    return bed.bedType === 'lower' || bed.bedType === 'single'
  }

  return {
    validateDrop,
    validateGuestBedCompatibility,
    isGenderCompatible,
    isBunkCompatible,
  }
}
