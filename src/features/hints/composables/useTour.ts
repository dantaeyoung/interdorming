/**
 * Tour Composable
 * Provides spotlight tour functionality using Driver.js
 */

import { ref } from 'vue'
import { driver, type DriveStep, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'

const hasSeenTour = ref(false)
const isTourActive = ref(false)

// Check localStorage for tour status
const TOUR_STORAGE_KEY = 'dormAssignments-hasSeenTour'

function loadTourStatus() {
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY)
    hasSeenTour.value = stored === 'true'
  } catch {
    hasSeenTour.value = false
  }
}

function saveTourStatus() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    hasSeenTour.value = true
  } catch {
    // Ignore storage errors
  }
}

// Map of data-tour attributes to tab IDs
const tabMapping: Record<string, string> = {
  'tab-guest-data': 'guest-data',
  'tab-assignment': 'assignment',
  'tab-timeline': 'timeline',
  'tab-configuration': 'configuration',
}

// Create tour steps with optional tab switching callback
function createTourSteps(switchTab?: (tabId: string) => void): DriveStep[] {
  const createTabStep = (dataTourAttr: string, title: string, description: string): DriveStep => {
    const tabId = tabMapping[dataTourAttr]
    return {
      element: `[data-tour="${dataTourAttr}"]`,
      popover: {
        title,
        description,
        side: 'bottom',
        align: 'start',
      },
      onHighlightStarted: tabId && switchTab ? () => switchTab(tabId) : undefined,
    }
  }

  return [
    {
      popover: {
        title: 'Welcome to Interdorming!',
        description: 'This tool helps you assign retreat guests to dormitory beds. Let\'s take a quick tour of the main features.',
        side: 'over',
        align: 'center',
      },
    },
    createTabStep('tab-guest-data', 'Guest Data', 'Start here. Upload a CSV file with your guest list, or add guests manually one by one.'),
    createTabStep('tab-assignment', 'Table View', 'This is where the magic happens. Drag guests from the left panel onto beds on the right to assign them.'),
    createTabStep('tab-timeline', 'Timeline View', 'See guest arrivals and departures over time. Great for planning room turnover on busy days.'),
    createTabStep('tab-configuration', 'Room Configuration', 'Set up your dormitories, rooms, and beds here. Changes are saved automatically.'),
    {
      element: '[data-tour="header-stats"]',
      popover: {
        title: 'Assignment Progress',
        description: 'Keep track of how many guests are assigned. This updates in real-time as you work.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="hint-banner"]',
      popover: {
        title: 'Helpful Hints',
        description: 'Context-aware hints appear here to guide you through the workflow. They\'ll suggest what to do next based on your progress.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'You\'re Ready!',
        description: 'That\'s the basics! The green hints bar will guide you through each step. Click "Take a Tour" anytime to see this again.',
        side: 'over',
        align: 'center',
      },
    },
  ]
}

export interface UseTourOptions {
  switchTab?: (tabId: string) => void
}

export function useTour(options: UseTourOptions = {}) {
  // Initialize tour status from localStorage
  loadTourStatus()

  const tourSteps = createTourSteps(options.switchTab)

  const driverInstance = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'dorm-tour-popover',
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onDestroyed: () => {
      saveTourStatus()
      isTourActive.value = false
    },
    steps: tourSteps,
  })

  function startTour() {
    isTourActive.value = true
    driverInstance.drive()
  }

  function resetTour() {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY)
      hasSeenTour.value = false
    } catch {
      // Ignore
    }
  }

  return {
    hasSeenTour,
    isTourActive,
    startTour,
    resetTour,
  }
}
