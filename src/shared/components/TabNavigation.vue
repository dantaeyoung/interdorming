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
        <span class="tab-label" :data-label="tab.label">{{ tab.label }}</span>
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

.tab-label {
  display: inline-flex;
  flex-direction: column;
  align-items: center;

  &::after {
    content: attr(data-label);
    display: block;
    font-weight: 600;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
}

.tab-list {
  display: flex;
  gap: 2px;
  padding: 0 10px;
  position: relative;
}

.tab {
  background: transparent;
  border: 2px solid transparent;
  border-bottom: none;
  padding: 3px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  border-radius: 6px 6px 0 0;
  height: 26px;
  box-sizing: border-box;
  text-align: center;

  &:hover:not(.active):not(.highlighted) {
    color: #374151;
    background-color: #f3f4f6;
  }

  &.active {
    color: #1f2937;
    background-color: white;
    font-weight: 600;
    // Border on top, left, right
    border: 2px solid #9ca3af;
    border-bottom: none;
    z-index: 2;

    // Left line extending to screen edge
    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      right: 100%;
      width: 100vw;
      height: 2px;
      background: #9ca3af;
    }

    // Right line extending to screen edge
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 100%;
      width: 100vw;
      height: 2px;
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
