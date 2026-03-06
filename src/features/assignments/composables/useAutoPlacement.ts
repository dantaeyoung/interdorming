/**
 * Auto-Placement Composable
 * Implements group-first auto-placement with weighted scoring and progressive constraint relaxation.
 *
 * Two-stage algorithm per pass:
 *   Stage 1: Place groups as whole units (largest/hardest first)
 *   Stage 2: Place remaining individuals using per-bed scoring
 */

import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { classifyGuests } from './useGroupClassification'
import type { ClassifiedGroup } from './useGroupClassification'
import type { Guest, Bed, Room, FlatRoom } from '@/types'

interface PassConfig {
  name: string
  allowRelaxation: boolean
  relaxAge?: boolean
}

export interface UnplaceableGroup {
  groupName: string
  memberCount: number
  reason: string
}

export interface AutoPlaceResult {
  suggestions: Map<string, string>
  unplaceableGroups: UnplaceableGroup[]
}

export function useAutoPlacement() {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const settingsStore = useSettingsStore()

  /**
   * Helper function to check if guest requires lower bunk (hard constraint)
   */
  function requiresLowerBunk(guest: Guest): boolean {
    return (
      guest.lowerBunk === 'Yes' ||
      guest.lowerBunk === true ||
      guest.lowerBunk === 'TRUE' ||
      guest.lowerBunk === 'true'
    )
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  /**
   * Main auto-placement function
   * Uses 3-pass algorithm with progressive constraint relaxation.
   * Each pass runs Stage 1 (groups) then Stage 2 (individuals).
   */
  function autoPlaceGuests(): AutoPlaceResult {
    const suggestedAssignments = new Map<string, string>()
    const unplaceableGroups: UnplaceableGroup[] = []

    // Get all unassigned guests
    const unassignedGuests = guestStore.guests
      .filter(g => !assignmentStore.assignments.has(g.id))

    if (unassignedGuests.length === 0) {
      return { suggestions: suggestedAssignments, unplaceableGroups }
    }

    const availableBeds = getAvailableBeds()
    if (availableBeds.length === 0) {
      return { suggestions: suggestedAssignments, unplaceableGroups }
    }

    // Classify guests into groups and individuals using configured placement order
    const { groups, individuals } = classifyGuests(unassignedGuests, {
      groupPlacementOrder: settingsStore.settings.autoPlacement.groupPlacementOrder,
      couples: settingsStore.settings.autoPlacement.couples,
    })

    // Track remaining unplaced groups and individuals across passes
    let unplacedGroups = [...groups]
    let remainingIndividuals = [...individuals].sort((a, b) => {
      const aReq = requiresLowerBunk(a)
      const bReq = requiresLowerBunk(b)
      if (aReq && !bReq) return -1
      if (!aReq && bReq) return 1
      return 0
    })

    const passes: PassConfig[] = [
      { name: 'strict', allowRelaxation: false },
      { name: 'relaxed', allowRelaxation: true },
      { name: 'emergency', allowRelaxation: true, relaxAge: true },
    ]

    for (const passConfig of passes) {
      if (!passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.enabled) {
        break
      }
      if (passConfig.allowRelaxation && !settingsStore.settings.autoPlacement.allowConstraintRelaxation) {
        break
      }

      // Stage 1: Place groups as whole units
      if (unplacedGroups.length > 0) {
        const placedGroupNames = groupPlacementPass(
          unplacedGroups,
          suggestedAssignments,
          passConfig
        )
        unplacedGroups = unplacedGroups.filter(g => !placedGroupNames.has(g.groupName))
      }

      // Stage 2: Place remaining individuals
      if (remainingIndividuals.length > 0) {
        placementPass(remainingIndividuals, availableBeds, suggestedAssignments, passConfig)
        remainingIndividuals = remainingIndividuals.filter(g => !suggestedAssignments.has(g.id))
      }

      if (unplacedGroups.length === 0 && remainingIndividuals.length === 0) {
        break
      }
    }

    // Record unplaceable groups
    for (const group of unplacedGroups) {
      const unplacedMembers = group.members.filter(m => !suggestedAssignments.has(m.id))
      if (unplacedMembers.length > 0) {
        unplaceableGroups.push({
          groupName: group.groupName,
          memberCount: group.members.length,
          reason: `No room fits all ${group.members.length} members`,
        })
      }
    }

    return { suggestions: suggestedAssignments, unplaceableGroups }
  }

  // ---------------------------------------------------------------------------
  // Group placement (Stage 1)
  // ---------------------------------------------------------------------------

  /**
   * Get available (unassigned, un-suggested) beds in a specific room
   */
  function getAvailableBedsInRoom(
    room: FlatRoom,
    suggestedAssignments: Map<string, string>
  ): Bed[] {
    return room.beds.filter(
      bed =>
        bed.active !== false &&
        !bed.assignedGuestId &&
        !isBedSuggested(bed.bedId, suggestedAssignments)
    )
  }

  /**
   * Score a candidate room for an entire group.
   * Returns -Infinity if any hard constraint is violated.
   */
  function scoreRoomForGroup(
    group: ClassifiedGroup,
    room: FlatRoom,
    availableRoomBeds: Bed[],
    suggestedAssignments: Map<string, string>,
    passConfig: PassConfig
  ): number {
    const priorities = settingsStore.settings.autoPlacement.priorities

    // Hard constraint: enough beds
    if (availableRoomBeds.length < group.members.length) return -Infinity

    // Hard constraint: gender match for ALL members
    for (const member of group.members) {
      if (scoreGenderMatch(member, room) < 0) return -Infinity
    }

    // Hard constraint: enough lower/single bunks for members who need them
    const membersNeedingLower = group.members.filter(m => requiresLowerBunk(m))
    const lowerOrSingleBeds = availableRoomBeds.filter(
      b => b.bedType === 'lower' || b.bedType === 'single'
    )
    if (lowerOrSingleBeds.length < membersNeedingLower.length) return -Infinity

    let score = 0

    // Room fit: prefer rooms where group fills most/all beds
    const roomFitPriority = priorities.find(p => p.name === 'roomFit')
    if (roomFitPriority?.enabled) {
      const totalBeds = room.beds.filter(b => b.active !== false).length
      if (totalBeds > 0) {
        score += (group.members.length / totalBeds) * roomFitPriority.weight
      }
    }

    // Building consolidation (use any bed in the room — all share the same dormitory)
    const minimizeBuildingsPriority = priorities.find(p => p.name === 'minimizeBuildings')
    if (minimizeBuildingsPriority?.enabled && availableRoomBeds.length > 0) {
      score +=
        scoreMinimizeBuildings(availableRoomBeds[0], suggestedAssignments) *
        minimizeBuildingsPriority.weight
    }

    // Gendered room preference — for groups, directly check if the group needs coed
    const genderedRoomPriority = priorities.find(p => p.name === 'genderedRoomPreference')
    if (genderedRoomPriority?.enabled) {
      score +=
        scoreGroupGenderedRoomPreference(group, room) * genderedRoomPriority.weight
    }

    // Age compatibility (average across members)
    const agePriority = priorities.find(p => p.name === 'ageCompatibility')
    if (agePriority?.enabled && !passConfig.relaxAge) {
      let totalAgeScore = 0
      let count = 0
      for (const member of group.members) {
        const ageScore = scoreAgeCompatibility(member, room, suggestedAssignments)
        totalAgeScore += ageScore
        count++
      }
      if (count > 0) {
        score += (totalAgeScore / count) * agePriority.weight
      }
    }

    // Family grouping bonus: whole group placed together = full bonus
    const familyPriority = priorities.find(p => p.name === 'families')
    if (familyPriority?.enabled) {
      score += 1.0 * familyPriority.weight
    }

    return score
  }

  /**
   * Assign group members to beds within a chosen room.
   * Members requiring lower bunk get lower/single beds first.
   */
  function placeGroupInRoom(
    group: ClassifiedGroup,
    availableRoomBeds: Bed[],
    suggestedAssignments: Map<string, string>
  ): void {
    const remainingBeds = [...availableRoomBeds]

    // First: members requiring lower bunk → lower/single beds
    const lowerBunkMembers = group.members.filter(m => requiresLowerBunk(m))
    const otherMembers = group.members.filter(m => !requiresLowerBunk(m))

    for (const member of lowerBunkMembers) {
      const bedIndex = remainingBeds.findIndex(
        b => b.bedType === 'lower' || b.bedType === 'single'
      )
      if (bedIndex !== -1) {
        suggestedAssignments.set(member.id, remainingBeds[bedIndex].bedId)
        remainingBeds.splice(bedIndex, 1)
      }
    }

    // Then: remaining members → any available beds
    for (const member of otherMembers) {
      if (remainingBeds.length > 0) {
        suggestedAssignments.set(member.id, remainingBeds[0].bedId)
        remainingBeds.splice(0, 1)
      }
    }
  }

  /**
   * Group placement pass: place each group as a whole unit in the best-scoring room.
   * Returns the set of groupNames that were successfully placed.
   */
  function groupPlacementPass(
    groups: ClassifiedGroup[],
    suggestedAssignments: Map<string, string>,
    passConfig: PassConfig
  ): Set<string> {
    const placedGroupNames = new Set<string>()

    for (const group of groups) {
      let bestScore = -Infinity
      let bestRoom: FlatRoom | null = null
      let bestRoomBeds: Bed[] = []

      for (const room of dormitoryStore.getAllRooms) {
        const availableRoomBeds = getAvailableBedsInRoom(room, suggestedAssignments)
        if (availableRoomBeds.length < group.members.length) continue

        const score = scoreRoomForGroup(
          group,
          room,
          availableRoomBeds,
          suggestedAssignments,
          passConfig
        )

        if (score > bestScore) {
          bestScore = score
          bestRoom = room
          bestRoomBeds = availableRoomBeds
        }
      }

      // Place if any room passed hard constraints (score > -Infinity)
      if (bestRoom && bestScore > -Infinity) {
        placeGroupInRoom(group, bestRoomBeds, suggestedAssignments)
        placedGroupNames.add(group.groupName)
      }
    }

    return placedGroupNames
  }

  // ---------------------------------------------------------------------------
  // Individual placement (Stage 2) — existing algorithm, unchanged
  // ---------------------------------------------------------------------------

  /**
   * Single placement pass for individual guests.
   * For each guest, finds the best-scoring available bed.
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

    // 1. Gender matching (hard constraint - always enforced)
    const genderScore = scoreGenderMatch(guest, room)
    if (genderScore < 0) return -Infinity // Hard constraint violation

    // 2. Bunk requirement (hard constraint - always enforced)
    const bunkScore = scoreBunkRequirement(guest, bed)
    if (bunkScore < 0) return -Infinity // Hard constraint violation

    // 3. Gendered room preference (prefer M/F over co-ed for same-gender groups)
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

    // 5. Age compatibility (relaxed in pass 3)
    const agePriority = priorities.find(p => p.name === 'ageCompatibility')
    if (agePriority?.enabled && !passConfig.relaxAge) {
      score += scoreAgeCompatibility(guest, room, suggestedAssignments) * agePriority.weight
    }

    return score
  }

  // ---------------------------------------------------------------------------
  // Scoring helpers (shared by group and individual placement)
  // ---------------------------------------------------------------------------

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
   * Score bunk requirement (hard constraint - never relaxed)
   * Returns -1 for violation (triggers -Infinity), 0-1 for acceptable
   * Guests who require lower bunks (for mobility issues) cannot be placed in upper bunks
   */
  function scoreBunkRequirement(guest: Guest, bed: Bed): number {
    // Check if guest requires lower bunk
    const needsLowerBunk =
      guest.lowerBunk === 'Yes' ||
      guest.lowerBunk === true ||
      guest.lowerBunk === 'TRUE' ||
      guest.lowerBunk === 'true'

    if (!needsLowerBunk) return 0 // No requirement - any bed is acceptable

    // Guest needs lower bunk - check bed type
    if (bed.bedType === 'lower' || bed.bedType === 'single') {
      return 1.0 // Perfect match
    }

    if (bed.bedType === 'upper') {
      return -1 // Hard constraint violation - cannot place someone with mobility issues in upper bunk
    }

    return 0 // Unknown bed type - neutral score
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
   * Score gendered room preference for a whole group.
   * Same-gender groups get a strong penalty for coed rooms (reserve coed for
   * mixed-gender families). Mixed-gender groups get a bonus for coed rooms.
   */
  function scoreGroupGenderedRoomPreference(group: ClassifiedGroup, room: Room): number {
    const genders = new Set(
      group.members.map(m => m.gender?.toUpperCase()).filter(Boolean)
    )
    const isSameGender = genders.size === 1
    const singleGender = isSameGender ? [...genders][0] : null

    if (isSameGender && singleGender) {
      // Same-gender group: strongly prefer matching gendered room
      if (
        (room.roomGender === 'M' && singleGender === 'M') ||
        (room.roomGender === 'F' && singleGender === 'F')
      ) {
        return 1.0
      }
      // Coed room is wasteful for a same-gender group — penalize
      if (room.roomGender === 'Coed') {
        return -0.5
      }
      return 0
    }

    // Mixed-gender group: coed is the only option that fits
    if (room.roomGender === 'Coed') {
      return 1.0
    }
    return -0.3
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
    const suggestedBedIds = new Set(suggestedAssignments.values())

    for (const room of dormitory.rooms) {
      if (!room.active) continue

      for (const dormBed of room.beds) {
        if (dormBed.active === false) continue
        totalBeds++

        // Check if bed is occupied (actual assignment or suggestion)
        if (dormBed.assignedGuestId || suggestedBedIds.has(dormBed.bedId)) {
          occupiedBeds++
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

  // ---------------------------------------------------------------------------
  // Shared utilities
  // ---------------------------------------------------------------------------

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
   * Uses individual-only algorithm (no group logic needed for single-room placement)
   */
  function autoPlaceGuestsInRoom(room: Room): Map<string, string> {
    const suggestedAssignments = new Map<string, string>()

    // Get unassigned guests and prioritize those with hard constraints
    // Place guests with lower bunk requirements FIRST to ensure they get valid beds
    let unassignedGuests = guestStore.guests
      .filter(g => !assignmentStore.assignments.has(g.id))
      .sort((a, b) => {
        const aRequiresLower = requiresLowerBunk(a)
        const bRequiresLower = requiresLowerBunk(b)

        // Guests requiring lower bunks go first
        if (aRequiresLower && !bRequiresLower) return -1
        if (!aRequiresLower && bRequiresLower) return 1
        return 0
      })

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
      { name: 'relaxed', allowRelaxation: true },
      { name: 'emergency', allowRelaxation: true, relaxAge: true },
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
