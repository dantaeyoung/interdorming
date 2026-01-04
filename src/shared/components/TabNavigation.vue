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
  background-color: #f9fafb;
  border-bottom: 3px solid #d1d5db;
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
  background: transparent;
  border: 3px solid transparent;
  border-bottom: none;
  padding: 8px 18px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  border-radius: 8px 8px 0 0;

  &:hover:not(.active) {
    color: #374151;
    background-color: rgba(0, 0, 0, 0.03);
  }

  &.active {
    color: #1f2937;
    background-color: white;
    border-color: #d1d5db;
    // White bottom border overlaps the container's gray border
    border-bottom: 3px solid white;
    font-weight: 600;
  }

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px #93c5fd;
  }

  &.highlighted {
    animation: tab-pulse 1.5s ease-in-out infinite;
    background-color: #ecfdf5;
    color: #059669;
    border-color: #6ee7b7;
    border-bottom: 3px solid #ecfdf5;

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
