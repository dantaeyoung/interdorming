<template>
  <Modal
    v-model="isOpen"
    title="New Layout"
    :show-default-footer="false"
    max-width="450px"
  >
    <div class="new-layout-form">
      <div class="form-group">
        <label class="form-label">Name <span class="required">*</span></label>
        <input
          ref="nameInput"
          v-model="name"
          class="form-input"
          placeholder="e.g., Summer Mode"
          @keydown.enter="handleConfirm"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <input
          v-model="description"
          class="form-input"
          placeholder="Optional description"
          @keydown.enter="handleConfirm"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Starting point</label>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" v-model="startingPoint" value="blank" />
            <span>Blank (empty)</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="startingPoint" value="clone" />
            <span>Clone from:</span>
          </label>
          <select
            v-if="startingPoint === 'clone'"
            v-model="cloneFromId"
            class="clone-select"
          >
            <option v-for="layout in layouts" :key="layout.id" :value="layout.id">
              {{ layout.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn" @click="handleCancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!name.trim()" @click="handleConfirm">
        Create
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Modal } from '@/shared/components'
import type { RoomLayout } from '@/types'

interface Props {
  modelValue: boolean
  layouts: RoomLayout[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'create': [name: string, description: string, cloneFromId?: string]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const nameInput = ref<HTMLInputElement | null>(null)
const name = ref('')
const description = ref('')
const startingPoint = ref<'blank' | 'clone'>('blank')
const cloneFromId = ref<string>('')

// Reset form when opened
watch(isOpen, (newVal) => {
  if (newVal) {
    name.value = ''
    description.value = ''
    startingPoint.value = 'blank'
    cloneFromId.value = props.layouts[0]?.id || ''
    nextTick(() => nameInput.value?.focus())
  }
})

function handleConfirm() {
  if (!name.value.trim()) return

  const cloneId = startingPoint.value === 'clone' ? cloneFromId.value : undefined
  emit('create', name.value.trim(), description.value.trim(), cloneId)
  isOpen.value = false
}

function handleCancel() {
  isOpen.value = false
}
</script>

<style scoped lang="scss">
.new-layout-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #374151;

  .required {
    color: #ef4444;
  }
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #374151;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;

  input[type="radio"] {
    cursor: pointer;
  }
}

.clone-select {
  margin-left: 24px;
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.825rem;
  color: #374151;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  background: white;
  color: #374151;

  &:hover {
    background: #f3f4f6;
  }
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
