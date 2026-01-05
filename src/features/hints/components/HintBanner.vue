<template>
  <Transition name="hint-toast">
    <div v-if="currentHint && !isCollapsed" class="hint-toast" data-tour="hint-banner">
      <div class="hint-content">
        <span class="hint-icon">{{ currentHint.icon }}</span>
        <span
          class="hint-message"
          :class="{ 'has-tooltip': currentHint.id === 'has-warnings' && conflictDetails.length > 0 }"
          :title="currentHint.id === 'has-warnings' ? conflictTooltip : undefined"
        >
          {{ currentHint.message }}
        </span>
      </div>
      <button class="hint-dismiss" @click="handleDismiss" title="Dismiss">
        &times;
      </button>
    </div>
    <button
      v-else-if="currentHint && isCollapsed"
      class="hint-collapsed"
      @click="expandHints"
      title="Show hint"
    >
      <span class="hint-collapsed-icon">💡</span>
      <span class="hint-collapsed-text">Next</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { toRef, computed } from 'vue'
import { useHints } from '../composables/useHints'
import type { HintAction } from '../types/hints'

const props = defineProps<{
  currentTab: string
}>()

const emit = defineEmits<{
  action: [action: string]
}>()

const { currentHint, isCollapsed, dismissHint, collapseHints, expandHints, conflictDetails } = useHints(toRef(props, 'currentTab'))

/**
 * Generate tooltip text for conflict warnings
 */
const conflictTooltip = computed(() => {
  if (!conflictDetails.value || conflictDetails.value.length === 0) {
    return ''
  }

  return conflictDetails.value
    .map(detail => `${detail.guestName}: ${detail.warnings.join(', ')}`)
    .join('\n')
})

function handleAction(action: HintAction) {
  // For 'highlight-tab' actions, the tab is already highlighted via useHints
  // Just emit for non-highlight actions like 'upload-csv', 'load-sample', 'export'
  if (action.action !== 'highlight-tab') {
    emit('action', action.action)
  }
}

function handleDismiss() {
  // Just collapse the hint, don't dismiss it permanently
  // This allows users to re-open it with the "Next" button
  collapseHints()
}
</script>

<style scoped lang="scss">
.hint-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  border-radius: 8px;
  margin-left: 12px;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.hint-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.hint-message {
  font-size: 0.8rem;
  color: #065f46;
  font-weight: 500;
  line-height: 1.3;

  &.has-tooltip {
    text-decoration: underline dotted;
    text-underline-offset: 2px;
    cursor: help;
  }
}

.hint-dismiss {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }
}

.hint-collapsed {
  padding: 4px 10px;
  border-radius: 14px;
  background: #10b981;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  margin-left: 12px;

  &:hover {
    background: #059669;
    box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
  }

  .hint-collapsed-icon {
    font-size: 0.8rem;
  }

  .hint-collapsed-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
}

// Transition animations
.hint-toast-enter-active {
  transition: all 0.3s ease-out;
}

.hint-toast-leave-active {
  transition: all 0.2s ease-in;
}

.hint-toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.hint-toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
