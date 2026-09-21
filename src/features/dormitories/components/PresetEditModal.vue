<template>
  <Modal :model-value="isOpen" :title="modalTitle" max-width="720px" @update:model-value="(v) => !v && cancel()">
    <div class="form">
      <label class="field">
        <span class="field-label">Name</span>
        <input v-model="name" type="text" placeholder="e.g. Women's Retreat" />
      </label>

      <label class="field">
        <span class="field-label">Description (optional)</span>
        <input v-model="description" type="text" placeholder="e.g. North wing closed, Maple Hall switches to F" />
      </label>

      <div class="field">
        <span class="field-label">What changes when this preset is applied?</span>
        <div class="entries">
          <OverrideEntryEditor
            v-for="(entry, idx) in entries"
            :key="idx"
            :model-value="entry"
            @update:model-value="(v) => entries[idx] = v"
            @remove="removeEntry(idx)"
          />
          <button type="button" class="add-entry-btn" @click="addEntry">+ Add change</button>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn" @click="cancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!canSave" @click="save">{{ isEditing ? 'Save' : 'Create preset' }}</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import OverrideEntryEditor from './OverrideEntryEditor.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { OverridePreset, PresetTemplateEntry } from '@/types'

interface Props {
  isOpen: boolean
  /** The preset being edited; null = creating a new one. */
  preset: OverridePreset | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()

const name = ref('')
const description = ref('')
const entries = ref<PresetTemplateEntry[]>([])

const isEditing = computed(() => props.preset !== null)
const modalTitle = computed(() => (isEditing.value ? 'Edit preset' : 'New preset'))
const canSave = computed(() => name.value.trim().length > 0 && entries.value.length > 0)

watch(
  () => [props.isOpen, props.preset] as const,
  ([open, preset]) => {
    if (!open) return
    if (preset) {
      name.value = preset.name
      description.value = preset.description ?? ''
      // Deep clone so edits don't mutate the live preset until Save.
      entries.value = preset.entries.map(e => ({ target: { ...e.target }, change: { ...e.change } } as PresetTemplateEntry))
    } else {
      name.value = ''
      description.value = ''
      entries.value = []
    }
  },
  { immediate: true }
)

function addEntry() {
  const firstDorm = dormitoryStore.dormitories[0]
  entries.value.push({
    target: { kind: 'dormitory', dormitoryName: firstDorm?.dormitoryName ?? '' },
    change: { attr: 'active', value: false },
  })
}

function removeEntry(idx: number) {
  entries.value.splice(idx, 1)
}

function save() {
  if (!canSave.value) return
  if (isEditing.value && props.preset) {
    dormitoryStore.updatePreset(props.preset.id, {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      entries: entries.value,
    })
  } else {
    dormitoryStore.addPreset({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      entries: entries.value,
    })
  }
  emit('close')
}

function cancel() {
  emit('close')
}
</script>

<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

input[type="text"] {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-entry-btn {
  align-self: flex-start;
  padding: 6px 12px;
  border: 1px dashed #9ca3af;
  background: white;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;

  &:hover { border-color: #4f46e5; color: #4f46e5; }
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover { background: #f3f4f6; }

  &.btn-primary {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;

    &:hover { background: #4338ca; }

    &:disabled {
      background: #c7d2fe;
      cursor: not-allowed;
    }
  }
}
</style>
