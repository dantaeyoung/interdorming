<template>
  <svg
    ref="svgRef"
    class="room-group-lines-overlay"
    :width="width"
    :height="height"
  >
    <g v-for="group in groupPaths" :key="group.name + '-' + updateKey">
      <!-- Path lines (with pointer events for hover/click) -->
      <path
        :d="group.path"
        :class="['group-path', { highlighted: group.name === hoveredGroupName, dimmed: hoveredGroupName && group.name !== hoveredGroupName, picked: isGroupPicked(group.name) }]"
        :stroke="hoveredGroupName && group.name !== hoveredGroupName ? '#d1d5db' : group.color"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        @mouseenter="handlePathHover(group.name)"
        @mouseleave="handlePathLeave"
        @click.stop="handleGroupClick(group.name, $event)"
      />
      <!-- Invisible wider path for easier hover/click detection -->
      <path
        :d="group.path"
        fill="none"
        stroke="transparent"
        stroke-width="12"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="pointer-events: stroke"
        @mouseenter="handlePathHover(group.name)"
        @mouseleave="handlePathLeave"
        @click.stop="handleGroupClick(group.name, $event)"
      />
      <!-- Dots at each group member -->
      <circle
        v-for="(dot, idx) in group.dots"
        :key="idx"
        :cx="dot.x"
        :cy="dot.y"
        r="4"
        :class="['group-dot', { highlighted: group.name === hoveredGroupName, dimmed: hoveredGroupName && group.name !== hoveredGroupName, picked: isGroupPicked(group.name) }]"
        :fill="hoveredGroupName && group.name !== hoveredGroupName ? '#d1d5db' : group.color"
        :stroke="group.name === hoveredGroupName ? '#fff' : 'none'"
        stroke-width="2"
        @mouseenter="handlePathHover(group.name)"
        @mouseleave="handlePathLeave"
        @click.stop="handleGroupClick(group.name, $event)"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useGroupConnections } from '@/shared/composables/useGroupConnections'
import { useGuestStore } from '@/stores/guestStore'
import { useDragDrop } from '@/features/assignments/composables/useDragDrop'

interface Props {
  containerRef: HTMLElement
}

const props = defineProps<Props>()

const svgRef = ref<SVGSVGElement | null>(null)
const guestStore = useGuestStore()
const { pickGroup, pickedGroupGuestIds } = useDragDrop()

// Convert prop to a ref for the composable
const containerRefAsRef = toRef(props, 'containerRef')

const {
  width,
  height,
  updateKey,
  groupPaths,
  hoveredGroupName,
  handlePathHover,
  handlePathLeave,
} = useGroupConnections(containerRefAsRef as any)

// Check if a group is currently picked
function isGroupPicked(groupName: string): boolean {
  if (pickedGroupGuestIds.value.length === 0) return false
  const groupMembers = guestStore.guests.filter(g => g.groupName === groupName)
  return groupMembers.some(g => pickedGroupGuestIds.value.includes(g.id))
}

// Handle click on group lines to pick up the group
function handleGroupClick(groupName: string, event: MouseEvent) {
  const groupMembers = guestStore.guests.filter(g => g.groupName === groupName)
  if (groupMembers.length === 0) return
  pickGroup(groupMembers.map(g => g.id), event)
}
</script>

<style scoped lang="scss">
.room-group-lines-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
  overflow: visible;
}

.group-path {
  pointer-events: stroke;
  cursor: grab;
  transition: stroke-width 0.2s, opacity 0.2s, stroke 0.2s, filter 0.2s;
  opacity: 0.6;

  &.highlighted {
    stroke-width: 4;
    opacity: 1;
    filter: drop-shadow(0 0 3px currentColor);
  }

  &.dimmed {
    opacity: 0.3;
  }

  &.picked {
    stroke-width: 3;
    opacity: 1;
    stroke-dasharray: 6 3;
    cursor: grabbing;
    animation: picked-pulse 1s ease-in-out infinite;
  }
}

@keyframes picked-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.group-dot {
  pointer-events: all;
  cursor: grab;
  transition: r 0.2s, opacity 0.2s, fill 0.2s, filter 0.2s;
  opacity: 0.8;

  &.highlighted {
    r: 6;
    opacity: 1;
    filter: drop-shadow(0 0 3px currentColor);
  }

  &.dimmed {
    opacity: 0.3;
  }

  &.picked {
    r: 6;
    opacity: 1;
    cursor: grabbing;
    animation: picked-pulse 1s ease-in-out infinite;
  }
}
</style>
