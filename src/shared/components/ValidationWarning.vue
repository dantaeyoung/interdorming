<template>
  <div v-if="warnings.length > 0" class="validation-warning" :class="severityClass">
    <span class="warning-icon">⚠</span>
    <span v-if="showText" class="warning-text">{{ warningText }}</span>
    <div v-if="showTooltip" class="warning-tooltip">
      <ul>
        <li v-for="(warning, index) in warnings" :key="index">
          {{ warning }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

  &:hover .warning-tooltip {
    display: block;
  }
}

.warning-icon {
  font-size: 1rem;
}

.warning-text {
  white-space: nowrap;
}

.warning-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 200px;
  max-width: 300px;
  white-space: normal;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-bottom-color: #1f2937;
  }

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
