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

// Session state (not persisted)
const dismissedThisSession = ref<Set<HintId>>(new Set())
const isCollapsed = ref(false)
const highlightedTab = ref<string | null>(null)

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

    // Priority 1: No rooms
    if (!hasRooms) {
      if (activeTab === 'configuration') {
        // On Room Config tab - give specific instruction
        applicableHint = {
          id: 'no-rooms-on-config',
          icon: '🏠',
          message: 'Click "Add Dormitory" to create your first building',
          priority: 1,
        }
      } else {
        // On other tabs - highlight Room Config tab
        applicableHint = {
          id: 'no-rooms',
          icon: '🏠',
          message: 'Set up your dormitories and beds first',
          action: { label: 'Go to Room Config', action: 'highlight-tab' },
          priority: 1,
          targetTab: 'configuration',
        }
      }
    }
    // Priority 2: No guests (but has rooms)
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

    // Update highlighted tab based on current hint
    highlightedTab.value = applicableHint?.targetTab || null

    return applicableHint
  })

  /**
   * Dismiss the current hint for this session
   */
  function dismissHint(hintId: HintId) {
    dismissedThisSession.value.add(hintId)
    highlightedTab.value = null
  }

  /**
   * Collapse the hint banner to a small icon
   */
  function collapseHints() {
    isCollapsed.value = true
    highlightedTab.value = null
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

  return {
    // State
    currentHint,
    isCollapsed,
    hasAnyHints,
    highlightedTab,

    // Actions
    dismissHint,
    collapseHints,
    expandHints,
    toggleCollapsed,
    resetDismissed,
  }
}
