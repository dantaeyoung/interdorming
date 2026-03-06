/**
 * Group Classification Composable
 * Classifies unassigned guests into prioritized groups and individuals
 * for the group-first auto-placement algorithm.
 */

import type { Guest, GroupType, CoupleSettings } from '@/types'

export interface ClassifiedGroup {
  groupName: string
  members: Guest[]
  type: GroupType
  tierLabel: string
  hasMinors: boolean
  isFamily: boolean
}

export interface ClassifyOptions {
  groupPlacementOrder: GroupType[]
  couples: CoupleSettings
}

/**
 * Classify unassigned guests into prioritized groups and ungrouped individuals.
 *
 * Groups are classified into 4 types (2x2):
 *   - familyWithMinors / familyWithoutMinors
 *   - groupWithMinors / groupWithoutMinors
 *
 * Individuals (no groupName) are returned separately — always placed after groups.
 *
 * Mixed-gender couples (group of 2, no minors) can be split into individual
 * placement when the couple setting is enabled, unless either member is above
 * the keepTogetherAge threshold or requires a lower bunk.
 */
export function classifyGuests(
  unassignedGuests: Guest[],
  options: ClassifyOptions
): {
  groups: ClassifiedGroup[]
  individuals: Guest[]
} {
  const { groupPlacementOrder, couples } = options

  const groupMap = new Map<string, Guest[]>()
  const individuals: Guest[] = []

  for (const guest of unassignedGuests) {
    if (guest.groupName) {
      const existing = groupMap.get(guest.groupName) || []
      existing.push(guest)
      groupMap.set(guest.groupName, existing)
    } else {
      individuals.push(guest)
    }
  }

  const groups: ClassifiedGroup[] = []

  for (const [groupName, members] of groupMap.entries()) {
    const hasMinors = members.some(m => {
      const age = parseInt(String(m.age))
      return !isNaN(age) && age < 18
    })

    // Determine family vs group from indivGrp field
    let isFamily = false
    const indivGrpValues = members.map(m => (m.indivGrp ?? '').toLowerCase())

    if (indivGrpValues.some(v => v.includes('family'))) {
      isFamily = true
    } else if (indivGrpValues.some(v => v.includes('group'))) {
      isFamily = false
    } else {
      // Fallback: has minors → family, all adults → group
      isFamily = hasMinors
    }

    // Check if this is a mixed-gender couple that should be split
    if (couples.splitMixedGenderCouples && shouldSplitCouple(members, hasMinors, couples)) {
      individuals.push(...members)
      continue
    }

    let type: GroupType
    let tierLabel: string

    if (isFamily && hasMinors) {
      type = 'familyWithMinors'
      tierLabel = 'Family with minors'
    } else if (!isFamily && hasMinors) {
      type = 'groupWithMinors'
      tierLabel = 'Group with minors'
    } else if (isFamily && !hasMinors) {
      type = 'familyWithoutMinors'
      tierLabel = 'Family without minors'
    } else {
      type = 'groupWithoutMinors'
      tierLabel = 'Group without minors'
    }

    groups.push({ groupName, members, type, tierLabel, hasMinors, isFamily })
  }

  // Sort by position in groupPlacementOrder, then by size descending
  groups.sort((a, b) => {
    const aOrder = groupPlacementOrder.indexOf(a.type)
    const bOrder = groupPlacementOrder.indexOf(b.type)
    const aIndex = aOrder === -1 ? groupPlacementOrder.length : aOrder
    const bIndex = bOrder === -1 ? groupPlacementOrder.length : bOrder
    if (aIndex !== bIndex) return aIndex - bIndex
    return b.members.length - a.members.length
  })

  return { groups, individuals }
}

/**
 * Determine if a group of 2 is a mixed-gender couple that should be split
 * into individual placement.
 *
 * A couple is split when:
 *   - Exactly 2 members
 *   - Mixed gender (one M, one F)
 *   - No minors
 *   - Neither member is at or above the keepTogetherAge threshold
 *   - Neither member requires a lower bunk (mobility proxy)
 */
function shouldSplitCouple(
  members: Guest[],
  hasMinors: boolean,
  couples: CoupleSettings
): boolean {
  if (members.length !== 2) return false
  if (hasMinors) return false

  // Check mixed gender
  const genders = members.map(m => m.gender?.toUpperCase())
  const isMixedGender =
    genders.includes('M') && genders.includes('F')
  if (!isMixedGender) return false

  // Keep together if either member is at or above the age threshold
  for (const member of members) {
    const age = parseInt(String(member.age))
    if (!isNaN(age) && age >= couples.keepTogetherAge) return false
  }

  // Keep together if either member requires a lower bunk (mobility needs)
  for (const member of members) {
    const needsLower =
      member.lowerBunk === 'Yes' ||
      member.lowerBunk === true ||
      member.lowerBunk === 'TRUE' ||
      member.lowerBunk === 'true'
    if (needsLower) return false
  }

  return true
}
