<template>
  <div class="tabs">
    <div class="tab-list">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: modelValue === tab.id, highlighted: highlightedTab === tab.id }]"
        :data-tour="'tab-' + tab.id"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

interface Props {
  modelValue: string
  tabs: Tab[]
  highlightedTab?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

function selectTab(tabId: string) {
  emit('update:modelValue', tabId)
  emit('change', tabId)
}
</script>

<style scoped lang="scss">
.tabs {
  background-color: white;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.tab-list {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  position: relative;
}

.tab {
  background: transparent;
  border: none;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  border-radius: 8px 8px 0 0;
  // Fixed height to prevent layout shift when font-weight changes
  height: 42px;
  box-sizing: border-box;

  &:hover:not(.active):not(.highlighted) {
    color: #374151;
    background-color: #f3f4f6;
  }

  &.active {
    color: #1f2937;
    background-color: white;
    font-weight: 600;
    // Border on top, left, right
    border: 3px solid #9ca3af;
    border-bottom: none;
    z-index: 2;

    // Left line extending to screen edge
    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      right: 100%;
      width: 100vw;
      height: 3px;
      background: #9ca3af;
    }

    // Right line extending to screen edge
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 100%;
      width: 100vw;
      height: 3px;
      background: #9ca3af;
    }
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px #93c5fd;
  }

  &.highlighted:not(.active) {
    animation: tab-pulse 1.5s ease-in-out infinite;
    background-color: #ecfdf5;
    color: #059669;
    font-weight: 600;
    border-radius: 16px;
  }
}

@keyframes tab-pulse {
  0%, 100% {
    background-color: #ecfdf5;
  }
  50% {
    background-color: #d1fae5;
  }
}

@keyframes tab-glow {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
