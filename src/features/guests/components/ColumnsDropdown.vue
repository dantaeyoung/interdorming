<template>
  <div class="columns-dropdown" ref="dropdownRef">
    <button class="btn-columns" @click="isOpen = !isOpen">
      ⊞ Columns
    </button>
    <div v-if="isOpen" class="columns-panel">
      <div class="columns-panel-header">
        <span>Show/Hide Columns</span>
        <button class="btn-reset" @click="$emit('reset')">Reset</button>
      </div>
      <div class="columns-panel-list">
        <label
          v-for="col in columns"
          :key="col.key"
          class="column-toggle"
        >
          <input
            type="checkbox"
            :checked="col.visible"
            @change="$emit('toggle', col.key)"
          />
          {{ col.label }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ColumnConfig } from '@/types'

interface Props {
  columns: ColumnConfig[]
}

defineProps<Props>()
defineEmits<{
  (e: 'toggle', key: string): void
  (e: 'reset'): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped lang="scss">
.columns-dropdown {
  position: relative;
  display: inline-block;
}

.btn-columns {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #f3f4f6;
  }
}

.columns-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 4px;
}

.columns-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.85rem;
}

.btn-reset {
  padding: 2px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  color: #6b7280;

  &:hover {
    background: #f3f4f6;
  }
}

.columns-panel-list {
  padding: 8px 0;
}

.column-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #f9fafb;
  }

  input[type="checkbox"] {
    cursor: pointer;
  }
}
</style>
