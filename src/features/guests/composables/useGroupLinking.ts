/**
 * Composable for managing guest group linking functionality
 * Supports multi-select: click link on first guest, click additional guests to add,
 * then click "Finish Group" to assign them all to the same group.
 */

import { ref, computed } from 'vue'
import { useGuestStore } from '@/stores/guestStore'

// Singleton state for group linking
const linkingGuestIds = ref<Set<string>>(new Set())
const mousePosition = ref({ x: 0, y: 0 })

// Singleton state for group hover highlighting
const hoveredGroupName = ref<string | null>(null)

export function generateGroupNameFromMembers(lastNames: string[]): string {
  const uniqueNames = [...new Set(lastNames.map(n => n.toLowerCase()))]
    .map(lower => lastNames.find(n => n.toLowerCase() === lower)!)

  if (uniqueNames.length === 1) {
    return `${uniqueNames[0]} Family`
  }

  uniqueNames.sort((a, b) => a.localeCompare(b))
  return `${uniqueNames.join('-')} Group`
}

export function useGroupLinking() {
  const guestStore = useGuestStore()

  const isLinking = computed(() => linkingGuestIds.value.size > 0)

  // Kept for backward compat - returns the first guest that started the linking
  const linkingGuestId = computed(() => {
    const ids = Array.from(linkingGuestIds.value)
    return ids.length > 0 ? ids[0] : null
  })

  const linkingGuestName = computed(() => {
    if (!linkingGuestId.value) return ''
    const guest = guestStore.guests.find(g => g.id === linkingGuestId.value)
    return guest ? `${guest.preferredName || guest.firstName} ${guest.lastName}` : ''
  })

  const linkingCount = computed(() => linkingGuestIds.value.size)

  function startLinking(guestId: string, _guestName?: string) {
    linkingGuestIds.value = new Set([guestId])

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyDown)
  }

  function cancelLinking() {
    linkingGuestIds.value = new Set()

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('keydown', handleKeyDown)
  }

  /**
   * Toggle a guest in/out of the current linking selection
   */
  function toggleLinkingGuest(guestId: string) {
    if (!isLinking.value) return

    const newSet = new Set(linkingGuestIds.value)
    if (newSet.has(guestId)) {
      // Don't allow removing the last guest - cancel instead
      if (newSet.size <= 1) {
        cancelLinking()
        return
      }
      newSet.delete(guestId)
    } else {
      newSet.add(guestId)
    }
    linkingGuestIds.value = newSet
  }

  /**
   * Complete linking - called from old pair-wise flow or from "Finish Group" button.
   * If targetGuestId is provided (old flow), adds that guest then finishes.
   */
  function completeLinking(targetGuestId?: string) {
    if (targetGuestId) {
      const newSet = new Set(linkingGuestIds.value)
      newSet.add(targetGuestId)
      linkingGuestIds.value = newSet
    }

    if (linkingGuestIds.value.size < 2) {
      cancelLinking()
      return
    }

    // Collect all guests that will be in this group (including existing group members)
    const groupMemberIds = new Set<string>(linkingGuestIds.value)

    linkingGuestIds.value.forEach(id => {
      const guest = guestStore.guests.find(g => g.id === id)
      if (guest?.groupName) {
        guestStore.guests.forEach(g => {
          if (g.groupName === guest.groupName) {
            groupMemberIds.add(g.id)
          }
        })
      }
    })

    // Get all group members and generate a group name
    const groupMembers = guestStore.guests.filter(g => groupMemberIds.has(g.id))
    const groupName = generateGroupNameFromMembers(groupMembers.map(g => g.lastName))

    // Update all group members
    groupMemberIds.forEach(id => {
      guestStore.updateGuest(id, { groupName })
    })

    cancelLinking()
  }

  function handleMouseMove(e: MouseEvent) {
    mousePosition.value = { x: e.clientX, y: e.clientY }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cancelLinking()
    }
  }

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
    linkingGuestIds,
    linkingGuestName,
    linkingCount,
    mousePosition,
    hoveredGroupName,

    // Actions
    startLinking,
    cancelLinking,
    toggleLinkingGuest,
    completeLinking,
    setHoveredGroup,
    clearHoveredGroup,
  }
}
