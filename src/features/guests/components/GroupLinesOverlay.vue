<template>
  <svg
    ref="svgRef"
    class="group-lines-overlay"
    :width="width"
    :height="height"
  >
    <g v-for="group in groupPaths" :key="group.name + '-' + updateKey">
      <path
        :d="group.path"
        :class="['group-path', { highlighted: group.name === highlightedGroup, dimmed: highlightedGroup && group.name !== highlightedGroup }]"
        :stroke="highlightedGroup && group.name !== highlightedGroup ? '#d1d5db' : group.color"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-for="(dot, idx) in group.dots"
        :key="idx"
        :cx="dot.x"
        :cy="dot.y"
        r="4"
        :class="['group-dot', { highlighted: group.name === highlightedGroup, dimmed: highlightedGroup && group.name !== highlightedGroup }]"
        :fill="highlightedGroup && group.name !== highlightedGroup ? '#d1d5db' : group.color"
        :stroke="group.name === highlightedGroup ? '#fff' : 'none'"
        stroke-width="2"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGroupLinking } from '../composables/useGroupLinking'
import type { Guest } from '@/types'

interface Props {
  guests: Guest[]
  rowPositions?: number[] // Y center positions for each row
  columnWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  rowPositions: () => [],
  columnWidth: 30
})

// Update key to force re-render when positions change
const updateKey = ref(0)

const { hoveredGroupName } = useGroupLinking()

const svgRef = ref<SVGSVGElement | null>(null)
const width = ref(props.columnWidth)
const height = ref(500)
const rowPositions = ref<Map<string, number>>(new Map())

// Group colors for visual distinction
const groupColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

const highlightedGroup = computed(() => hoveredGroupName.value)

// Get unique groups and their members
const groups = computed(() => {
  const groupMap = new Map<string, { guestIds: string[], indices: number[] }>()

  props.guests.forEach((guest, index) => {
    if (guest.groupName) {
      if (!groupMap.has(guest.groupName)) {
        groupMap.set(guest.groupName, { guestIds: [], indices: [] })
      }
      const group = groupMap.get(guest.groupName)!
      group.guestIds.push(guest.id)
      group.indices.push(index)
    }
  })

  return groupMap
})

// Assign horizontal offsets to groups to avoid overlapping lines
const groupOffsets = computed(() => {
  const offsets = new Map<string, number>()
  const groupNames = Array.from(groups.value.keys())

  // Sort groups by their first appearance index
  groupNames.sort((a, b) => {
    const aFirst = groups.value.get(a)!.indices[0]
    const bFirst = groups.value.get(b)!.indices[0]
    return aFirst - bFirst
  })

  // Assign tracks to groups, trying to reuse tracks when possible
  const tracks: { name: string, endIndex: number }[] = []

  groupNames.forEach(name => {
    const group = groups.value.get(name)!
    const startIndex = Math.min(...group.indices)
    const endIndex = Math.max(...group.indices)

    // Find a track that's free (ended before this group starts)
    let trackIndex = tracks.findIndex(t => t.endIndex < startIndex)

    if (trackIndex === -1) {
      // No free track, create new one
      trackIndex = tracks.length
      tracks.push({ name, endIndex })
    } else {
      // Reuse track
      tracks[trackIndex] = { name, endIndex }
    }

    offsets.set(name, trackIndex)
  })

  return offsets
})

// Calculate SVG paths for each group
const groupPaths = computed(() => {
  const paths: Array<{
    name: string
    path: string
    dots: Array<{ x: number, y: number }>
    color: string
  }> = []

  const dotX = 8 // X position for dots (left side)
  const trackSpacing = 5 // Horizontal spacing between tracks
  const baseTrackX = 18 // Starting X for vertical tracks

  groups.value.forEach((group, name) => {
    const offset = groupOffsets.value.get(name) || 0
    const trackX = baseTrackX + (offset * trackSpacing)
    const colorIndex = Array.from(groups.value.keys()).indexOf(name) % groupColors.length
    const color = groupColors[colorIndex]

    const dots: Array<{ x: number, y: number }> = []
    const sortedIndices = [...group.indices].sort((a, b) => a - b)

    // Calculate Y positions for each member using actual row positions if available
    const yPositions = sortedIndices.map(index => {
      if (props.rowPositions.length > index) {
        return props.rowPositions[index]
      }
      // Fallback to estimated position
      return (index * 49) + 24.5
    })

    // Build dots array
    yPositions.forEach(y => {
      dots.push({ x: dotX, y })
    })

    // Build path: horizontal from each dot to track, then vertical trunk
    let pathD = ''

    if (yPositions.length === 1) {
      // Single member - just a dot, no line needed
      // Path is empty, just show the dot
    } else {
      // Multiple members - draw bracket
      const minY = Math.min(...yPositions)
      const maxY = Math.max(...yPositions)

      // Draw horizontal lines from each dot to the track
      yPositions.forEach((y, i) => {
        pathD += `M ${dotX} ${y} L ${trackX} ${y} `
      })

      // Draw vertical trunk line
      pathD += `M ${trackX} ${minY} L ${trackX} ${maxY}`
    }

    paths.push({ name, path: pathD, dots, color })
  })

  return paths
})

// Update height based on row positions or guest count
function updateDimensions() {
  if (props.rowPositions.length > 0) {
    // Use the last row position plus some padding
    const lastPos = props.rowPositions[props.rowPositions.length - 1]
    height.value = lastPos + 50
  } else {
    height.value = props.guests.length * 49
  }
  updateKey.value++
}

// Watch for guest changes
watch(() => props.guests, () => {
  nextTick(updateDimensions)
}, { deep: true })

// Watch for row position changes
watch(() => props.rowPositions, () => {
  nextTick(updateDimensions)
}, { deep: true })

onMounted(() => {
  updateDimensions()
})
</script>

<style scoped lang="scss">
.group-lines-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.group-path {
  transition: stroke-width 0.2s, opacity 0.2s, stroke 0.2s;
  opacity: 0.6;

  &.highlighted {
    stroke-width: 3;
    opacity: 1;
  }

  &.dimmed {
    opacity: 0.3;
  }
}

.group-dot {
  transition: r 0.2s, opacity 0.2s, fill 0.2s;
  opacity: 0.8;

  &.highlighted {
    r: 5;
    opacity: 1;
  }

  &.dimmed {
    opacity: 0.3;
  }
}
</style>
