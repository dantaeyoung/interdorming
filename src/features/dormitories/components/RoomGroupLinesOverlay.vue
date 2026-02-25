<template>
  <svg
    ref="svgRef"
    class="room-group-lines-overlay"
    :width="width"
    :height="height"
  >
    <g v-for="group in groupPaths" :key="group.name + '-' + updateKey">
      <!-- Path lines (with pointer events for hover) -->
      <path
        :d="group.path"
        :class="['group-path', { highlighted: group.name === hoveredGroupName, dimmed: hoveredGroupName && group.name !== hoveredGroupName }]"
        :stroke="hoveredGroupName && group.name !== hoveredGroupName ? '#d1d5db' : group.color"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        @mouseenter="handlePathHover(group.name)"
        @mouseleave="handlePathLeave"
      />
      <!-- Invisible wider path for easier hover detection -->
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
      />
      <!-- Dots at each group member -->
      <circle
        v-for="(dot, idx) in group.dots"
        :key="idx"
        :cx="dot.x"
        :cy="dot.y"
        r="4"
        :class="['group-dot', { highlighted: group.name === hoveredGroupName, dimmed: hoveredGroupName && group.name !== hoveredGroupName }]"
        :fill="hoveredGroupName && group.name !== hoveredGroupName ? '#d1d5db' : group.color"
        :stroke="group.name === hoveredGroupName ? '#fff' : 'none'"
        stroke-width="2"
        @mouseenter="handlePathHover(group.name)"
        @mouseleave="handlePathLeave"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useGroupConnections } from '@/shared/composables/useGroupConnections'

interface Props {
  containerRef: HTMLElement
}

const props = defineProps<Props>()

const svgRef = ref<SVGSVGElement | null>(null)

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
  pointer-events: all;
  transition: r 0.2s, opacity 0.2s, fill 0.2s;
  opacity: 0.8;
  cursor: pointer;

  &.highlighted {
    r: 5;
    opacity: 1;
  }

  &.dimmed {
    opacity: 0.3;
  }
}
</style>
