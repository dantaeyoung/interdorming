/**
 * Hints Composable
 * Provides context-aware hints based on application state
 */

import { computed, ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import type { Hint, HintId } from '../types/hints'

// Session state (not persisted)
const dismissedThisSession = ref<Set<HintId>>(new Set())
const isCollapsed = ref(false)

// Hint definitions with priority (lower number = higher priority)
const HINTS: Hint[] = [
  {
    id: 'no-rooms',
    icon: '🏠',
    message: 'Set up your dormitories and beds first',
    action: { label: 'Go to Room Config', action: 'room-config' },
    priority: 1,
  },
  {
    id: 'no-guests',
    icon: '👥',
    message: 'Upload your guest list to get started',
    action: { label: 'Upload CSV', action: 'upload-csv' },
    secondaryAction: { label: 'Load Sample', action: 'load-sample' },
    priority: 2,
  },
  {
    id: 'no-assignments',
    icon: '↔️',
    message: 'Drag guests onto beds to assign them',
    action: { label: 'Go to Assignments', action: 'guest-assignment' },
    priority: 3,
  },
  {
    id: 'has-warnings',
    icon: '⚠️',
    message: '', // Dynamic: "X assignments have conflicts"
    action: { label: 'Review warnings', action: 'guest-assignment' },
    priority: 4,
  },
  {
    id: 'partial-assignments',
    icon: '📋',
    message: '', // Dynamic: "X of Y guests assigned"
    action: { label: 'View unassigned', action: 'guest-assignment' },
    priority: 5,
  },
  {
    id: 'all-assigned',
    icon: '✓',
    message: 'All guests assigned!',
    action: { label: 'Export assignments', action: 'export' },
    priority: 6,
  },
]

export function useHints() {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const validationStore = useValidationStore()

  /**
   * Detect current app state and return the highest priority applicable hint
   */
  const currentHint = computed((): Hint | null => {
    const hasRooms = dormitoryStore.dormitories.length > 0
    const hasGuests = guestStore.guests.length > 0
    const assignmentCount = assignmentStore.assignments.size
    const guestCount = guestStore.guests.length
    const warnings = validationStore.getAllWarnings || {}
    const warningCount = Object.keys(warnings).length

    // Check each condition in priority order
    let applicableHint: Hint | null = null

    // Priority 1: No rooms
    if (!hasRooms) {
      applicableHint = HINTS.find(h => h.id === 'no-rooms') || null
    }
    // Priority 2: No guests (but has rooms)
    else if (!hasGuests) {
      applicableHint = HINTS.find(h => h.id === 'no-guests') || null
    }
    // Priority 3: No assignments (has guests and rooms)
    else if (assignmentCount === 0) {
      applicableHint = HINTS.find(h => h.id === 'no-assignments') || null
    }
    // Priority 4: Has warnings
    else if (warningCount > 0) {
      const hint = HINTS.find(h => h.id === 'has-warnings')
      if (hint) {
        applicableHint = {
          ...hint,
          message: `${warningCount} assignment${warningCount === 1 ? '' : 's'} ha${warningCount === 1 ? 's' : 've'} conflicts`,
        }
      }
    }
    // Priority 5: Partial assignments
    else if (assignmentCount < guestCount) {
      const hint = HINTS.find(h => h.id === 'partial-assignments')
      if (hint) {
        applicableHint = {
          ...hint,
          message: `${assignmentCount} of ${guestCount} guests assigned`,
        }
      }
    }
    // Priority 6: All assigned (success state)
    else if (assignmentCount === guestCount && guestCount > 0) {
      applicableHint = HINTS.find(h => h.id === 'all-assigned') || null
    }

    // Check if this hint has been dismissed this session
    if (applicableHint && dismissedThisSession.value.has(applicableHint.id)) {
      return null
    }

    return applicableHint
  })

  /**
   * Dismiss the current hint for this session
   */
  function dismissHint(hintId: HintId) {
    dismissedThisSession.value.add(hintId)
  }

  /**
   * Collapse the hint banner to a small icon
   */
  function collapseHints() {
    isCollapsed.value = true
  }

  /**
   * Expand the hint banner
   */
  function expandHints() {
    isCollapsed.value = false
  }

  /**
   * Toggle collapsed state
   */
  function toggleCollapsed() {
    isCollapsed.value = !isCollapsed.value
  }

  /**
   * Reset dismissed hints (useful for testing)
   */
  function resetDismissed() {
    dismissedThisSession.value.clear()
  }

  /**
   * Check if there are any hints available (even if dismissed)
   */
  const hasAnyHints = computed(() => {
    const hasRooms = dormitoryStore.dormitories.length > 0
    const hasGuests = guestStore.guests.length > 0
    return !hasRooms || !hasGuests || guestStore.guests.length > 0
  })

  return {
    // State
    currentHint,
    isCollapsed,
    hasAnyHints,

    // Actions
    dismissHint,
    collapseHints,
    expandHints,
    toggleCollapsed,
    resetDismissed,
  }
}
