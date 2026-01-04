<template>
  <Transition name="hint-slide">
    <div v-if="currentHint && !isCollapsed" class="hint-banner">
      <div class="hint-content">
        <span class="hint-icon">{{ currentHint.icon }}</span>
        <span class="hint-message">{{ currentHint.message }}</span>
        <div class="hint-actions">
          <button
            v-if="currentHint.action"
            class="hint-btn hint-btn-primary"
            @click="handleAction(currentHint.action)"
          >
            {{ currentHint.action.label }}
          </button>
          <button
            v-if="currentHint.secondaryAction"
            class="hint-btn hint-btn-secondary"
            @click="handleAction(currentHint.secondaryAction)"
          >
            {{ currentHint.secondaryAction.label }}
          </button>
        </div>
      </div>
      <button class="hint-dismiss" @click="handleDismiss" title="Dismiss hint">
        &times;
      </button>
    </div>
    <button
      v-else-if="currentHint && isCollapsed"
      class="hint-collapsed"
      @click="expandHints"
      title="Show hint"
    >
      <span class="hint-icon">{{ currentHint.icon }}</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useHints } from '../composables/useHints'
import type { HintAction } from '../types/hints'

const props = defineProps<{
  currentTab: string
}>()

const emit = defineEmits<{
  action: [action: string]
}>()

const { currentHint, isCollapsed, dismissHint, collapseHints, expandHints } = useHints(toRef(props, 'currentTab'))

function handleAction(action: HintAction) {
  // For 'highlight-tab' actions, the tab is already highlighted via useHints
  // Just emit for non-highlight actions like 'upload-csv', 'load-sample', 'export'
  if (action.action !== 'highlight-tab') {
    emit('action', action.action)
  }
}

function handleDismiss() {
  if (currentHint.value) {
    dismissHint(currentHint.value.id)
  }
  collapseHints()
}
</script>

<style scoped lang="scss">
.hint-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-bottom: 1px solid #6ee7b7;
  gap: 12px;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
}

.hint-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.hint-message {
  font-size: 0.875rem;
  color: #065f46;
  font-weight: 500;
}

.hint-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.hint-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border: none;

  &.hint-btn-primary {
    background: #10b981;
    color: white;

    &:hover {
      background: #059669;
    }
  }

  &.hint-btn-secondary {
    background: white;
    color: #059669;
    border: 1px solid #6ee7b7;

    &:hover {
      background: #ecfdf5;
    }
  }
}

.hint-dismiss {
  background: none;
  border: none;
  color: #10b981;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    background: rgba(16, 185, 129, 0.1);
  }
}

.hint-collapsed {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 100;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }

  .hint-icon {
    font-size: 1.25rem;
    filter: brightness(0) invert(1);
  }
}

// Transition animations
.hint-slide-enter-active {
  transition: all 0.3s ease-out;
}

.hint-slide-leave-active {
  transition: all 0.2s ease-in;
}

.hint-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.hint-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
