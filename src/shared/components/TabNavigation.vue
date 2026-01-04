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
  background-color: #f3f4f6;
  border-bottom: 3px solid #9ca3af;
  flex-shrink: 0;
  position: relative;
}

.tab-list {
  display: flex;
  gap: 0;
  padding: 0 12px;
  // Offset tabs down by 3px so active tab can overlap the border
  margin-bottom: -3px;
}

.tab {
  background: #e5e7eb;
  border: 3px solid #9ca3af;
  border-bottom: none;
  padding: 8px 18px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  border-radius: 8px 8px 0 0;
  // Gap between tabs
  margin-right: 4px;
  // Fixed height to prevent layout shift when font-weight changes
  height: 38px;
  box-sizing: border-box;

  &:hover:not(.active):not(.highlighted) {
    color: #374151;
    background-color: #d1d5db;
  }

  &.active {
    color: #1f2937;
    background-color: white;
    border-color: #9ca3af;
    // White bottom border overlaps the container's gray border
    border-bottom: 3px solid white;
    font-weight: 600;
    // Bring active tab to front
    z-index: 1;
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px #93c5fd;
  }

  &.highlighted {
    animation: tab-pulse 1.5s ease-in-out infinite;
    background-color: #ecfdf5;
    color: #059669;
    border-color: #6ee7b7;
    border-bottom: 3px solid #ecfdf5;
    z-index: 1;

    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 8px 8px 0 0;
      box-shadow: 0 0 0 2px #10b981;
      animation: tab-glow 1.5s ease-in-out infinite;
      pointer-events: none;
    }
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
