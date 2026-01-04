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
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.tab-list {
  display: flex;
  gap: 2px;
  padding: 0 12px;
}

.tab {
  background: none;
  border: none;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  position: relative;

  &:hover {
    color: #1f2937;
    background-color: #f3f4f6;
  }

  &.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    background-color: white;
  }

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px #93c5fd;
  }

  &.highlighted {
    animation: tab-pulse 1.5s ease-in-out infinite;
    background-color: #ecfdf5;
    color: #059669;
    border-bottom-color: #10b981;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 4px;
      box-shadow: 0 0 0 2px #10b981;
      animation: tab-glow 1.5s ease-in-out infinite;
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
