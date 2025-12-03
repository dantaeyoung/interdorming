/**
 * Auto-Placement Composable
 * Implements the auto-placement algorithm with weighted scoring and progressive constraint relaxation
 */

import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Guest, Bed, Room } from '@/types'

interface PassConfig {
  name: string
  allowRelaxation: boolean
  relaxBunkPreference?: boolean
  relaxAge?: boolean
}

export function useAutoPlacement() {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const settingsStore = useSettingsStore()

  /**
   * Main auto-placement function
   * Uses 3-pass algorithm with progressive constraint relaxation
   */
  function autoPlaceGuests(): Map<string, string> {
    const suggestedAssignments = new Map<string, string>()

    // Get unassigned guests
    let unassignedGuests = guestStore.guests.filter(
      g => !assignmentStore.assignments.has(g.id)
    )

    if (unassignedGuests.length === 0) {
      return suggestedAssignments
    }

    // Get available beds
    const availableBeds = getAvailableBeds()

    if (availableBeds.length === 0) {
      return suggestedAssignments
    }

    // Define passes with progressive constraint relaxation
    const passes: PassConfig[] = [
      { name: 'strict', allowRelaxation: false },
      { name: 'relaxed', allowRelaxation: true, relaxBunkPreference: true },
      { name: 'emergency', allowRelaxation: true, relaxBunkPreference: true, relaxAge: true },
    ]

    // Execute each pass
    for (const passConfig of passes) {
      if (!passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.enabled) {
        break // Stop if auto-placement disabled
      }

      if (passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.allowConstraintRelaxation) {
        break // Stop after first pass if relaxation not allowed
      }

      const placedCount = placementPass(
        unassignedGuests,
        availableBeds,
        suggestedAssignments,
        passConfig
      )

      // Remove placed guests from queue
      if (placedCount > 0) {
        unassignedGuests = unassignedGuests.filter(
          g => !suggestedAssignments.has(g.id)
        )
      }

      // Stop if all guests placed
      if (unassignedGuests.length === 0) {
        break
      }
    }

    return suggestedAssignments
  }

  /**
   * Single placement pass
   * For each guest, finds the best-scoring available bed
   */
  function placementPass(
    guests: Guest[],
    availableBeds: Bed[],
    suggestedAssignments: Map<string, string>,
    passConfig: PassConfig
  ): number {
    let placedCount = 0

    for (const guest of guests) {
      // Skip if already placed in previous pass
      if (suggestedAssignments.has(guest.id)) {
        continue
      }

      let bestScore = -Infinity
      let bestBed: Bed | null = null

      for (const bed of availableBeds) {
        // Skip if bed is already assigned or suggested
        if (bed.assignedGuestId) continue
        if (isBedSuggested(bed.bedId, suggestedAssignments)) continue

        const score = calculatePlacementScore(guest, bed, passConfig, suggestedAssignments)

        if (score > bestScore) {
          bestScore = score
          bestBed = bed
        }
      }

      // Only place if score is positive
      if (bestBed && bestScore > 0) {
        suggestedAssignments.set(guest.id, bestBed.bedId)
        placedCount++
      }
    }

    return placedCount
  }

  /**
   * Calculate weighted placement score for guest-bed combination
   */
  function calculatePlacementScore(
    guest: Guest,
    bed: Bed,
    passConfig: PassConfig,
    suggestedAssignments: Map<string, string>
  ): number {
    let score = 0
    const priorities = settingsStore.settings.autoPlacement.priorities

    // Find room containing this bed
    const room = dormitoryStore.getRoomByBedId(bed.bedId)
    if (!room) return -Infinity

    // 1. Gender matching (hard constraint - highest priority, never relaxed)
    const genderPriority = priorities.find(p => p.name === 'gender')
    if (genderPriority?.enabled) {
      const genderScore = scoreGenderMatch(guest, room)
      if (genderScore < 0) return -Infinity // Hard constraint violation
      score += genderScore * genderPriority.weight
    }

    // 2. Gendered room preference (prefer M/F over co-ed for same-gender groups)
    const genderedRoomPriority = priorities.find(p => p.name === 'genderedRoomPreference')
    if (genderedRoomPriority?.enabled) {
      score += scoreGenderedRoomPreference(guest, room) * genderedRoomPriority.weight
    }

    // 3. Family/group grouping
    const familyPriority = priorities.find(p => p.name === 'families')
    if (familyPriority?.enabled) {
      score += scoreFamilyGrouping(guest, room, suggestedAssignments) * familyPriority.weight
    }

    // 4. Minimize buildings (prefer dorms with existing occupancy)
    const minimizeBuildingsPriority = priorities.find(p => p.name === 'minimizeBuildings')
    if (minimizeBuildingsPriority?.enabled) {
      score +=
        scoreMinimizeBuildings(bed, suggestedAssignments) * minimizeBuildingsPriority.weight
    }

    // 5. Bunk preference (relaxed in pass 2+)
    const bunkPriority = priorities.find(p => p.name === 'bunkPreference')
    if (bunkPriority?.enabled && !passConfig.relaxBunkPreference) {
      score += scoreBunkPreference(guest, bed) * bunkPriority.weight
    }

    // 6. Age compatibility (relaxed in pass 3)
    const agePriority = priorities.find(p => p.name === 'ageCompatibility')
    if (agePriority?.enabled && !passConfig.relaxAge) {
      score += scoreAgeCompatibility(guest, room, suggestedAssignments) * agePriority.weight
    }

    return score
  }

  /**
   * Score gender matching (hard constraint)
   * Returns -1 for mismatch (triggers -Infinity), 0-1 for acceptable
   */
  function scoreGenderMatch(guest: Guest, room: Room): number {
    // Co-ed rooms accept anyone
    if (room.roomGender === 'Coed') return 1.0

    const guestGender = guest.gender?.toUpperCase()

    // Unknown gender gets neutral score
    if (!guestGender) return 0

    // Exact match required for gendered rooms
    if (room.roomGender === 'M' && guestGender === 'M') return 1.0
    if (room.roomGender === 'F' && guestGender === 'F') return 1.0

    // Gender mismatch is forbidden
    return -1
  }

  /**
   * Score preference for gendered rooms over co-ed
   * Prefers gendered rooms (M/F) for same-gender groups
   * Prefers co-ed rooms for mixed-gender groups
   */
  function scoreGenderedRoomPreference(guest: Guest, room: Room): number {
    const guestGender = guest.gender?.toUpperCase()

    if (!guestGender) return 0

    // Determine if guest's group is same-gender or mixed
    const groupGenders: string[] = [guestGender]

    if (guest.groupName) {
      // Collect genders of all group members
      for (const otherGuest of guestStore.guests) {
        if (otherGuest.groupName === guest.groupName && otherGuest.id !== guest.id) {
          const otherGender = otherGuest.gender?.toUpperCase()
          if (otherGender) {
            groupGenders.push(otherGender)
          }
        }
      }
    }

    // Check if all group members are same gender
    const isSameGenderGroup = groupGenders.every(g => g === guestGender)
    const isMixedGenderGroup = !isSameGenderGroup && groupGenders.length > 1

    // For same-gender individuals/groups: prefer gendered rooms over co-ed
    if (isSameGenderGroup) {
      // Matching gendered room gets highest score
      if (
        (room.roomGender === 'M' && guestGender === 'M') ||
        (room.roomGender === 'F' && guestGender === 'F')
      ) {
        return 1.0
      }
      // Co-ed room is acceptable but not preferred
      if (room.roomGender === 'Coed') {
        return 0.5
      }
      // Wrong gendered room (blocked by scoreGenderMatch anyway)
      return 0
    }

    // For mixed-gender groups: prefer co-ed rooms
    if (isMixedGenderGroup) {
      if (room.roomGender === 'Coed') {
        return 1.0
      }
      // Gendered rooms are less preferred for mixed-gender groups
      return -0.3
    }

    return 0
  }

  /**
   * Score family/group grouping preference
   * Rewards keeping family members together in same room
   */
  function scoreFamilyGrouping(
    guest: Guest,
    room: Room,
    suggestedAssignments: Map<string, string>
  ): number {
    // No group = neutral
    if (!guest.groupName) return 0

    // Count family members already in this room (actual + suggested)
    let familyInRoom = 0
    let familyElsewhere = 0

    for (const otherGuest of guestStore.guests) {
      if (otherGuest.id === guest.id) continue
      if (otherGuest.groupName !== guest.groupName) continue

      const assignedBedId =
        assignmentStore.assignments.get(otherGuest.id) ||
        suggestedAssignments.get(otherGuest.id)

      if (!assignedBedId) continue

      const otherRoom = dormitoryStore.getRoomByBedId(assignedBedId)
      if (otherRoom?.roomName === room.roomName) {
        familyInRoom++
      } else {
        familyElsewhere++
      }
    }

    // Prefer rooms where family is already present
    if (familyInRoom > 0) return 1.0

    // Penalize if splitting family
    if (familyElsewhere > 0) return -0.5

    return 0
  }

  /**
   * Score to minimize number of buildings/dorms in use
   * Prefers beds in dormitories that already have occupancy
   * This concentrates guests into fewer buildings
   */
  function scoreMinimizeBuildings(
    bed: Bed,
    suggestedAssignments: Map<string, string>
  ): number {
    // Find which dormitory this bed belongs to
    const dormitory = dormitoryStore.getDormitoryByBedId(bed.bedId)
    if (!dormitory) return 0

    // Count occupied beds in this dormitory (actual + suggested)
    let occupiedBeds = 0
    let totalBeds = 0

    for (const room of dormitory.rooms) {
      if (!room.active) continue

      for (const dormBed of room.beds) {
        if (dormBed.active === false) continue
        totalBeds++

        // Check if bed is occupied (actual assignment or suggestion)
        if (dormBed.assignedGuestId) {
          occupiedBeds++
        } else {
          // Check suggested assignments
          for (const suggestedBedId of suggestedAssignments.values()) {
            if (suggestedBedId === dormBed.bedId) {
              occupiedBeds++
              break
            }
          }
        }
      }
    }

    if (totalBeds === 0) return 0

    // Calculate occupancy percentage
    const occupancyRate = occupiedBeds / totalBeds

    // Higher score for dorms with higher occupancy
    // Empty dorm (0%) gets 0, half-full gets 0.5, full gets 1.0
    return occupancyRate
  }

  /**
   * Score bunk preference matching
   * Rewards lower bunk or single bed for guests who need them
   */
  function scoreBunkPreference(guest: Guest, bed: Bed): number {
    // No preference = neutral
    if (!guest.lowerBunk) return 0

    const needsLowerBunk =
      guest.lowerBunk === 'Yes' ||
      guest.lowerBunk === true ||
      guest.lowerBunk === 'TRUE' ||
      guest.lowerBunk === 'true'

    if (!needsLowerBunk) return 0

    // Reward lower bunk or single bed
    if (bed.bedType === 'lower' || bed.bedType === 'single') {
      return 1.0
    }

    // Penalize upper bunk
    if (bed.bedType === 'upper') {
      return -0.5
    }

    return 0
  }

  /**
   * Score age compatibility with roommates
   * Prefers similar ages, penalizes large age gaps
   */
  function scoreAgeCompatibility(
    guest: Guest,
    room: Room,
    suggestedAssignments: Map<string, string>
  ): number {
    if (!guest.age) return 0

    const guestAge = parseInt(String(guest.age))
    if (isNaN(guestAge)) return 0

    // Get ages of current and suggested roommates
    const roommateAges: number[] = []

    for (const bed of room.beds) {
      const assignedGuestId = bed.assignedGuestId

      // Check actual assignments
      if (assignedGuestId) {
        const roommate = guestStore.getGuestById(assignedGuestId)
        if (roommate?.age) {
          const age = parseInt(String(roommate.age))
          if (!isNaN(age)) roommateAges.push(age)
        }
      } else {
        // Check suggested assignments
        for (const [gId, bId] of suggestedAssignments.entries()) {
          if (bId === bed.bedId) {
            const roommate = guestStore.getGuestById(gId)
            if (roommate?.age) {
              const age = parseInt(String(roommate.age))
              if (!isNaN(age)) roommateAges.push(age)
            }
            break
          }
        }
      }
    }

    if (roommateAges.length === 0) return 0

    // Calculate average age gap
    const avgAge = roommateAges.reduce((sum, age) => sum + age, 0) / roommateAges.length
    const ageGap = Math.abs(guestAge - avgAge)

    // Score based on age gap (smaller gap = better)
    if (ageGap < 5) return 1.0
    if (ageGap < 10) return 0.5
    if (ageGap < 20) return 0.0
    return -0.3
  }

  /**
   * Get all available beds from active dormitories and rooms
   */
  function getAvailableBeds(): Bed[] {
    const availableBeds: Bed[] = []

    for (const dormitory of dormitoryStore.dormitories) {
      if (!dormitory.active) continue

      for (const room of dormitory.rooms) {
        if (!room.active) continue

        for (const bed of room.beds) {
          if (bed.active !== false && !bed.assignedGuestId) {
            availableBeds.push(bed)
          }
        }
      }
    }

    return availableBeds
  }

  /**
   * Check if bed already has a suggested assignment
   */
  function isBedSuggested(bedId: string, suggestedAssignments: Map<string, string>): boolean {
    for (const suggestedBedId of suggestedAssignments.values()) {
      if (suggestedBedId === bedId) {
        return true
      }
    }
    return false
  }

  /**
   * Auto-place guests in a specific room only
   * Uses same algorithm but limited to beds in the specified room
   */
  function autoPlaceGuestsInRoom(room: Room): Map<string, string> {
    const suggestedAssignments = new Map<string, string>()

    // Get unassigned guests
    let unassignedGuests = guestStore.guests.filter(
      g => !assignmentStore.assignments.has(g.id)
    )

    if (unassignedGuests.length === 0) {
      return suggestedAssignments
    }

    // Get available beds in this room only
    const availableBeds = room.beds.filter(
      bed => bed.active !== false && !bed.assignedGuestId
    )

    if (availableBeds.length === 0) {
      return suggestedAssignments
    }

    // Define passes with progressive constraint relaxation
    const passes: PassConfig[] = [
      { name: 'strict', allowRelaxation: false },
      { name: 'relaxed', allowRelaxation: true, relaxBunkPreference: true },
      { name: 'emergency', allowRelaxation: true, relaxBunkPreference: true, relaxAge: true },
    ]

    // Execute each pass
    for (const passConfig of passes) {
      if (!passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.enabled) {
        break // Stop if auto-placement disabled
      }

      if (passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.allowConstraintRelaxation) {
        break // Stop after first pass if relaxation not allowed
      }

      const placedCount = placementPass(
        unassignedGuests,
        availableBeds,
        suggestedAssignments,
        passConfig
      )

      // Remove placed guests from queue
      if (placedCount > 0) {
        unassignedGuests = unassignedGuests.filter(
          g => !suggestedAssignments.has(g.id)
        )
      }

      // Stop if all guests placed or room is full
      if (unassignedGuests.length === 0 || suggestedAssignments.size >= availableBeds.length) {
        break
      }
    }

    return suggestedAssignments
  }

  return {
    autoPlaceGuests,
    autoPlaceGuestsInRoom,
  }
}
