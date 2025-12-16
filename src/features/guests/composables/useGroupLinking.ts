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

    // Determine the group name to use
    let groupName: string

    if (sourceGuest.groupName && targetGuest.groupName) {
      // Both have groups - merge into source's group
      const oldGroupName = targetGuest.groupName
      groupName = sourceGuest.groupName

      // Update all guests with target's old group to source's group
      guestStore.guests.forEach(g => {
        if (g.groupName === oldGroupName) {
          guestStore.updateGuest(g.id, { groupName })
        }
      })
    } else if (sourceGuest.groupName) {
      // Source has a group, add target to it
      groupName = sourceGuest.groupName
      guestStore.updateGuest(targetGuestId, { groupName })
    } else if (targetGuest.groupName) {
      // Target has a group, add source to it
      groupName = targetGuest.groupName
      guestStore.updateGuest(linkingGuestId.value, { groupName })
    } else {
      // Neither has a group - create new one
      groupName = generateGroupName(sourceGuest.lastName, targetGuest.lastName)
      guestStore.updateGuest(linkingGuestId.value, { groupName })
      guestStore.updateGuest(targetGuestId, { groupName })
    }

    cancelLinking()
  }

  function generateGroupName(lastName1: string, lastName2: string): string {
    // If same last name, use that
    if (lastName1.toLowerCase() === lastName2.toLowerCase()) {
      return `${lastName1} Family`
    }

    // Otherwise combine both
    return `${lastName1}-${lastName2} Group`
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
