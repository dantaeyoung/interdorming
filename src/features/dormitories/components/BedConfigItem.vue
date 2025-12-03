<template>
  <div class="bed-config-item">
    <div class="bed-info">
      <select v-model="localBed.bedType" class="bed-type-select" @change="handleUpdate">
        <option value="upper">Upper</option>
        <option value="lower">Lower</option>
        <option value="single">Single</option>
      </select>
      <span class="bed-position">Pos: {{ localBed.position }}</span>
      <input
        v-model="localBed.bedId"
        class="bed-id-input"
        placeholder="Bed ID"
        @blur="handleUpdate"
      />
    </div>
    <div class="bed-actions">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="localBed.active"
          @change="handleUpdate"
        />
        <span>Active</span>
      </label>
      <button @click="$emit('remove')" class="btn-remove" title="Remove bed">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Bed } from '@/types'

interface Props {
  bed: Bed
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [bed: Bed]
  remove: []
}>()

const localBed = ref<Bed>({ ...props.bed })

watch(() => props.bed, (newBed) => {
  localBed.value = { ...newBed }
}, { deep: true })

function handleUpdate() {
  emit('update', { ...localBed.value })
}
</script>

<style scoped lang="scss">
.bed-config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  gap: 8px;
}

.bed-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bed-type-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.bed-position {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
}

.bed-id-input {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  flex: 1;
  min-width: 80px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.bed-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;

  input[type="checkbox"] {
    cursor: pointer;
  }
}

.btn-remove {
  padding: 4px 8px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #dc2626;
  }
}
</style>
