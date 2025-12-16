/**
 * Composable for managing guest group linking functionality
 * Allows users to link guests together by clicking
 */

import { ref, computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'

// Singleton state for group linking
const linkingGuestId = ref<string | null>(null)
const linkingGuestName = ref<string>('')
const mousePosition = ref({ x: 0, y: 0 })

// Singleton state for group hover highlighting
const hoveredGroupName = ref<string | null>(null)

export function useGroupLinking() {
  const guestStore = useGuestStore()

  const isLinking = computed(() => linkingGuestId.value !== null)

  function startLinking(guestId: string, guestName: string) {
    linkingGuestId.value = guestId
    linkingGuestName.value = guestName

    // Add mousemove listener
    document.addEventListener('mousemove', handleMouseMove)
    // Add escape key listener
    document.addEventListener('keydown', handleKeyDown)
  }

  function cancelLinking() {
    linkingGuestId.value = null
    linkingGuestName.value = ''

    // Remove listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('keydown', handleKeyDown)
  }

  function completeLinking(targetGuestId: string) {
    if (!linkingGuestId.value || linkingGuestId.value === targetGuestId) {
      cancelLinking()
      return
    }

    const sourceGuest = guestStore.guests.find(g => g.id === linkingGuestId.value)
    const targetGuest = guestStore.guests.find(g => g.id === targetGuestId)

    if (!sourceGuest || !targetGuest) {
      cancelLinking()
      return
    }

    // Collect all guests that will be in this group
    const groupMemberIds = new Set<string>([linkingGuestId.value, targetGuestId])

    // Add existing group members from both guests
    if (sourceGuest.groupName) {
      guestStore.guests.forEach(g => {
        if (g.groupName === sourceGuest.groupName) {
          groupMemberIds.add(g.id)
        }
      })
    }
    if (targetGuest.groupName) {
      guestStore.guests.forEach(g => {
        if (g.groupName === targetGuest.groupName) {
          groupMemberIds.add(g.id)
        }
      })
    }

    // Get all group members and their last names
    const groupMembers = guestStore.guests.filter(g => groupMemberIds.has(g.id))
    const groupName = generateGroupNameFromMembers(groupMembers.map(g => g.lastName))

    // Update all group members with the new group name
    groupMemberIds.forEach(id => {
      guestStore.updateGuest(id, { groupName })
    })

    cancelLinking()
  }

  function generateGroupNameFromMembers(lastNames: string[]): string {
    // Get unique last names (case-insensitive)
    const uniqueNames = [...new Set(lastNames.map(n => n.toLowerCase()))]
      .map(lower => lastNames.find(n => n.toLowerCase() === lower)!)

    if (uniqueNames.length === 1) {
      return `${uniqueNames[0]} Family`
    }

    // Sort alphabetically and join
    uniqueNames.sort((a, b) => a.localeCompare(b))
    return `${uniqueNames.join('-')} Group`
  }

  function handleMouseMove(e: MouseEvent) {
    mousePosition.value = { x: e.clientX, y: e.clientY }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cancelLinking()
    }
  }

  // Group hover functions
  function setHoveredGroup(groupName: string | null) {
    hoveredGroupName.value = groupName
  }

  function clearHoveredGroup() {
    hoveredGroupName.value = null
  }

  return {
    // State
    isLinking,
    linkingGuestId,
    linkingGuestName,
    mousePosition,
    hoveredGroupName,

    // Actions
    startLinking,
    cancelLinking,
    completeLinking,
    setHoveredGroup,
    clearHoveredGroup,
  }
}
