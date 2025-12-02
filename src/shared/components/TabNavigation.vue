<template>
  <div class="tabs">
    <div class="tab-list">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: modelValue === tab.id }]"
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
  margin-bottom: 20px;
}

.tab-list {
  display: flex;
  gap: 4px;
  padding: 0 20px;
}

.tab {
  background: none;
  border: none;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 3px solid transparent;
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
}
</style>
