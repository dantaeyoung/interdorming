<template>
  <div
    v-if="warnings.length > 0"
    ref="anchorRef"
    class="validation-warning"
    :class="severityClass"
    @mouseenter="handleMouseEnter"
    @mouseleave="showFloatingTooltip = false"
  >
    <span class="warning-icon">⚠</span>
    <span v-if="showText" class="warning-text">{{ warningText }}</span>
    <Teleport to="body">
      <div
        v-if="showTooltip && showFloatingTooltip"
        class="warning-tooltip-floating"
        :class="severityClass"
        :style="floatingPosition"
      >
        <ul>
          <li v-for="(warning, index) in warnings" :key="index">
            {{ warning }}
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  warnings: string[]
  severity?: 'error' | 'warning' | 'info'
  showText?: boolean
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'warning',
  showText: false,
  showTooltip: true,
})

const severityClass = computed(() => `severity-${props.severity}`)

const warningText = computed(() => {
  if (props.warnings.length === 1) {
    return props.warnings[0]
  }
  return `${props.warnings.length} warnings`
})

// Teleport-based tooltip — escapes any ancestor `overflow: hidden`
// (BedSlot / RoomCard) that was clipping the previous CSS-only tooltip.
const anchorRef = ref<HTMLDivElement | null>(null)
const showFloatingTooltip = ref(false)
const floatingPosition = ref({ top: '0px', left: '0px' })

function handleMouseEnter() {
  if (!anchorRef.value) return
  const rect = anchorRef.value.getBoundingClientRect()
  // Default below the anchor; clamp horizontally to viewport edges.
  const tooltipWidth = 280
  const left = Math.max(
    8,
    Math.min(window.innerWidth - tooltipWidth - 8, rect.left + rect.width / 2 - tooltipWidth / 2)
  )
  floatingPosition.value = {
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
  }
  showFloatingTooltip.value = true
}
</script>

<style scoped lang="scss">
.validation-warning {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  position: relative;
  cursor: help;

  &.severity-error {
    background-color: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  &.severity-warning {
    background-color: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  &.severity-info {
    background-color: #eff6ff;
    color: #1e40af;
    border: 1px solid #dbeafe;
  }
}

.warning-icon {
  font-size: 1rem;
}

.warning-text {
  white-space: nowrap;
}
</style>

<style lang="scss">
/* Global (un-scoped) styles for the Teleported tooltip. Lives at body
   level so ancestor overflow can't clip it. */
.warning-tooltip-floating {
  position: fixed;
  z-index: 99999;
  background-color: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  width: 280px;
  white-space: normal;
  font-size: 0.8rem;
  line-height: 1.4;
  pointer-events: none;

  ul {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      &::before {
        content: '• ';
        margin-right: 4px;
      }
    }
  }
}
</style>
