/**
 * Hints Composable
 * Provides context-aware hints based on application state
 */

import { computed, ref, type Ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useValidationStore } from '@/stores/validationStore'
import type { Hint, HintId } from '../types/hints'

export interface ConflictDetail {
  guestName: string
  bedId: string
  warnings: string[]
}

// Session state (not persisted)
const dismissedThisSession = ref<Set<HintId>>(new Set())
const isCollapsed = ref(false)
const highlightedTab = ref<string | null>(null)
const highlightedElement = ref<string | null>(null)

export function useHints(currentTab?: Ref<string>) {
  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const validationStore = useValidationStore()

  /**
   * Detect current app state and return the highest priority applicable hint
   * Adjusts hints based on current tab for more contextual guidance
   */
  const currentHint = computed((): Hint | null => {
    const hasRooms = dormitoryStore.dormitories.length > 0
    const hasGuests = guestStore.guests.length > 0
    const assignmentCount = assignmentStore.assignments.size
    const guestCount = guestStore.guests.length
    const warnings = validationStore.getAllWarnings || {}
    const warningCount = Object.keys(warnings).length
    const activeTab = currentTab?.value || 'guest-data'

    let applicableHint: Hint | null = null

    // Check for rooms and beds
    const hasDormitories = dormitoryStore.dormitories.length > 0
    const totalRooms = dormitoryStore.dormitories.reduce((sum, d) => sum + d.rooms.length, 0)
    const totalBeds = dormitoryStore.dormitories.reduce((sum, d) =>
      sum + d.rooms.reduce((rSum, r) => rSum + r.beds.length, 0), 0)

    // Priority 1: No dormitories
    if (!hasDormitories) {
      if (activeTab === 'configuration') {
        // On Room Config tab - give specific instruction
        applicableHint = {
          id: 'no-rooms-on-config',
          icon: '🏠',
          message: 'Click "Add Dormitory" to create your first building',
          priority: 1,
          targetElement: 'add-dormitory',
        }
      } else {
        // On other tabs - highlight Room Config tab
        applicableHint = {
          id: 'no-rooms',
          icon: '🏠',
          message: 'Set up your dormitories and beds first',
          priority: 1,
          targetTab: 'configuration',
        }
      }
    }
    // Priority 1b: Has dormitories but no rooms
    else if (totalRooms === 0) {
      if (activeTab === 'configuration') {
        applicableHint = {
          id: 'no-rooms-in-dorm',
          icon: '🚪',
          message: 'Click "Add Room" to add rooms to your dormitory',
          priority: 1,
          targetElement: 'add-room',
        }
      } else {
        applicableHint = {
          id: 'no-rooms',
          icon: '🚪',
          message: 'Add rooms to your dormitory',
          priority: 1,
          targetTab: 'configuration',
        }
      }
    }
    // Priority 1c: Has rooms but no beds
    else if (totalBeds === 0) {
      if (activeTab === 'configuration') {
        applicableHint = {
          id: 'no-beds-in-rooms',
          icon: '🛏️',
          message: 'Click "Add Bed" to add beds to your rooms',
          priority: 1,
          targetElement: 'add-bed',
        }
      } else {
        applicableHint = {
          id: 'no-beds',
          icon: '🛏️',
          message: 'Add beds to your rooms',
          priority: 1,
          targetTab: 'configuration',
        }
      }
    }
    // Priority 2: No guests (but has beds)
    else if (!hasGuests) {
      if (activeTab === 'guest-data') {
        // On Guest Data tab - give specific instruction
        applicableHint = {
          id: 'no-guests-on-data',
          icon: '👥',
          message: 'Upload a CSV file or add guests manually',
          action: { label: 'Upload CSV', action: 'upload-csv' },
          secondaryAction: { label: 'Load Sample', action: 'load-sample' },
          priority: 2,
        }
      } else {
        // On other tabs - highlight Guest Data tab
        applicableHint = {
          id: 'no-guests',
          icon: '👥',
          message: 'Upload your guest list to get started',
          action: { label: 'Go to Guest Data', action: 'highlight-tab' },
          secondaryAction: { label: 'Load Sample', action: 'load-sample' },
          priority: 2,
          targetTab: 'guest-data',
        }
      }
    }
    // Priority 3: No assignments (has guests and rooms)
    else if (assignmentCount === 0) {
      if (activeTab === 'assignment' || activeTab === 'timeline') {
        // On assignment tabs - give specific instruction
        applicableHint = {
          id: 'no-assignments-on-table',
          icon: '↔️',
          message: 'Drag guests from the left panel onto beds to assign them',
          priority: 3,
        }
      } else {
        // On other tabs - highlight Table View tab
        applicableHint = {
          id: 'no-assignments',
          icon: '↔️',
          message: 'Ready to assign guests to beds',
          action: { label: 'Go to Table View', action: 'highlight-tab' },
          priority: 3,
          targetTab: 'assignment',
        }
      }
    }
    // Priority 4: Has warnings
    else if (warningCount > 0) {
      applicableHint = {
        id: 'has-warnings',
        icon: '⚠️',
        message: `${warningCount} assignment${warningCount === 1 ? '' : 's'} ha${warningCount === 1 ? 's' : 've'} conflicts`,
        action: activeTab === 'assignment'
          ? undefined
          : { label: 'Review warnings', action: 'highlight-tab' },
        priority: 4,
        targetTab: activeTab === 'assignment' ? undefined : 'assignment',
      }
    }
    // Priority 5: Partial assignments
    else if (assignmentCount < guestCount) {
      const remaining = guestCount - assignmentCount
      applicableHint = {
        id: 'partial-assignments',
        icon: '📋',
        message: `${assignmentCount} of ${guestCount} guests assigned (${remaining} remaining)`,
        action: (activeTab === 'assignment' || activeTab === 'timeline')
          ? undefined
          : { label: 'Continue assigning', action: 'highlight-tab' },
        priority: 5,
        targetTab: (activeTab === 'assignment' || activeTab === 'timeline') ? undefined : 'assignment',
      }
    }
    // Priority 6: All assigned (success state)
    else if (assignmentCount === guestCount && guestCount > 0) {
      applicableHint = {
        id: 'all-assigned',
        icon: '✓',
        message: 'All guests assigned!',
        action: { label: 'Export assignments', action: 'export' },
        priority: 6,
      }
    }

    // Check if this hint has been dismissed this session
    if (applicableHint && dismissedThisSession.value.has(applicableHint.id)) {
      return null
    }

    // Update highlighted tab and element based on current hint
    highlightedTab.value = applicableHint?.targetTab || null
    highlightedElement.value = applicableHint?.targetElement || null

    return applicableHint
  })

  /**
   * Dismiss the current hint for this session
   */
  function dismissHint(hintId: HintId) {
    dismissedThisSession.value.add(hintId)
    highlightedTab.value = null
    highlightedElement.value = null
  }

  /**
   * Collapse the hint banner to a small icon
   */
  function collapseHints() {
    isCollapsed.value = true
    highlightedTab.value = null
    highlightedElement.value = null
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
    if (isCollapsed.value) {
      highlightedTab.value = null
    }
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

  /**
   * Get details of all assignment conflicts for tooltip display
   */
  const conflictDetails = computed((): ConflictDetail[] => {
    const warnings = validationStore.getAllWarnings || {}
    const details: ConflictDetail[] = []

    for (const [bedId, bedWarnings] of Object.entries(warnings)) {
      const guestId = assignmentStore.getAssignmentByBed(bedId)
      if (guestId) {
        const guest = guestStore.getGuestById(guestId)
        if (guest) {
          details.push({
            guestName: `${guest.preferredName || guest.firstName} ${guest.lastName}`,
            bedId,
            warnings: bedWarnings
          })
        }
      }
    }

    return details
  })

  return {
    // State
    currentHint,
    isCollapsed,
    hasAnyHints,
    highlightedTab,
    highlightedElement,
    conflictDetails,

    // Actions
    dismissHint,
    collapseHints,
    expandHints,
    toggleCollapsed,
    resetDismissed,
  }
}
