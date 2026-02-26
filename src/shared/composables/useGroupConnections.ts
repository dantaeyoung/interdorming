/**
 * Composable for drawing group connection lines across views
 * Calculates right-angle SVG paths connecting guests in the same group
 */

import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useGroupLinking } from '@/features/guests/composables/useGroupLinking'

// Group colors for visual distinction
const GROUP_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

interface GroupPath {
  name: string
  path: string
  dots: Array<{ x: number; y: number; guestId: string }>
  color: string
}

interface GuestPosition {
  guestId: string
  groupName: string
  x: number
  y: number
  width: number
  height: number
}

export function useGroupConnections(containerRef: Ref<HTMLElement | null> | undefined) {
  const guestStore = useGuestStore()
  const { hoveredGroupName, setHoveredGroup, clearHoveredGroup } = useGroupLinking()

  const width = ref(0)
  const height = ref(0)
  const updateKey = ref(0)
  const guestPositions = ref<GuestPosition[]>([])

  // ResizeObserver for tracking container changes
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null

  /**
   * Measure positions of all guest elements within the container
   */
  function measureGuestPositions() {
    if (!containerRef?.value) return

    const containerRect = containerRef.value.getBoundingClientRect()
    if (containerRect.width === 0 && containerRect.height === 0) return // hidden container
    const guestElements = containerRef.value.querySelectorAll('[data-guest-id]')
    const positions: GuestPosition[] = []

    guestElements.forEach((el) => {
      const guestId = el.getAttribute('data-guest-id')
      if (!guestId) return

      const guest = guestStore.getGuestById(guestId)
      if (!guest?.groupName) return

      const rect = el.getBoundingClientRect()
      positions.push({
        guestId,
        groupName: guest.groupName,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      })
    })

    guestPositions.value = positions
    width.value = containerRect.width
    height.value = containerRect.height
    updateKey.value++
  }

  /**
   * Group guests by their groupName
   */
  const groups = computed(() => {
    const groupMap = new Map<string, GuestPosition[]>()

    guestPositions.value.forEach((pos) => {
      if (!groupMap.has(pos.groupName)) {
        groupMap.set(pos.groupName, [])
      }
      groupMap.get(pos.groupName)!.push(pos)
    })

    // Only return groups with 2+ members
    const filtered = new Map<string, GuestPosition[]>()
    groupMap.forEach((members, name) => {
      if (members.length >= 2) {
        filtered.set(name, members)
      }
    })

    return filtered
  })

  /**
   * Calculate right-angle SVG paths for each group
   */
  const groupPaths = computed<GroupPath[]>(() => {
    const paths: GroupPath[] = []
    const groupNames = Array.from(groups.value.keys())

    groups.value.forEach((members, name) => {
      const colorIndex = groupNames.indexOf(name) % GROUP_COLORS.length
      const color = GROUP_COLORS[colorIndex]

      // Calculate centroid X position (average of all member X positions)
      const centroidX = members.reduce((sum, m) => sum + m.x, 0) / members.length

      // Sort members by Y position
      const sortedMembers = [...members].sort((a, b) => a.y - b.y)

      // Build dots array
      const dots = sortedMembers.map((m) => ({
        x: m.x,
        y: m.y,
        guestId: m.guestId,
      }))

      // Build right-angle path
      let pathD = ''

      if (sortedMembers.length >= 2) {
        const minY = sortedMembers[0].y
        const maxY = sortedMembers[sortedMembers.length - 1].y

        // Draw horizontal lines from each member to the centroid
        sortedMembers.forEach((m) => {
          pathD += `M ${m.x} ${m.y} L ${centroidX} ${m.y} `
        })

        // Draw vertical trunk line at centroid
        pathD += `M ${centroidX} ${minY} L ${centroidX} ${maxY}`
      }

      paths.push({ name, path: pathD, dots, color })
    })

    return paths
  })

  /**
   * Handle hover on SVG path
   */
  function handlePathHover(groupName: string) {
    setHoveredGroup(groupName)
  }

  function handlePathLeave() {
    clearHoveredGroup()
  }

  /**
   * Setup observers
   */
  function setupObservers() {
    if (!containerRef?.value) return

    // ResizeObserver for container size changes
    resizeObserver = new ResizeObserver(() => {
      nextTick(measureGuestPositions)
    })
    resizeObserver.observe(containerRef.value)

    // MutationObserver for DOM changes (assignments changing)
    mutationObserver = new MutationObserver(() => {
      nextTick(measureGuestPositions)
    })
    mutationObserver.observe(containerRef.value, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-guest-id'],
    })
  }

  function cleanup() {
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
  }

  // Watch for containerRef becoming available
  watch(
    () => containerRef?.value,
    (newVal) => {
      if (newVal) {
        cleanup() // Clean up old observers first
        nextTick(() => {
          setupObservers()
          measureGuestPositions()
        })
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    if (containerRef?.value) {
      nextTick(() => {
        setupObservers()
        measureGuestPositions()
      })
    }
  })

  onUnmounted(cleanup)

  return {
    // Dimensions
    width,
    height,
    updateKey,

    // Paths
    groupPaths,
    hoveredGroupName,

    // Methods
    measureGuestPositions,
    handlePathHover,
    handlePathLeave,
  }
}
