<template>
  <Modal :model-value="isOpen" title="Add one-off override" max-width="640px" @update:model-value="(v) => !v && cancel()">
    <div class="form">
      <p class="hint">Use this for a single, untemplated change (e.g. a broken bed, a coordinator's last-minute swap). For repeating configurations, create a preset instead.</p>

      <OverrideEntryEditor
        v-if="entry"
        :model-value="entry"
        :removable="false"
        @update:model-value="(v) => entry = v"
      />

      <div class="date-row">
        <label class="field">
          <span class="field-label">From</span>
          <input v-model="effectiveFrom" type="date" />
        </label>
        <label class="field">
          <span class="field-label">To (blank = open-ended)</span>
          <input v-model="effectiveTo" type="date" />
        </label>
      </div>

      <label class="field">
        <span class="field-label">Note (optional)</span>
        <input v-model="note" type="text" placeholder="e.g. Heater broken, awaiting repair" />
      </label>

      <div v-if="dateError" class="warning-banner error">{{ dateError }}</div>
    </div>

    <template #footer>
      <button class="btn" @click="cancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!canApply" @click="apply">Add override</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import OverrideEntryEditor from './OverrideEntryEditor.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { PresetTemplateEntry } from '@/types'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()

const entry = ref<PresetTemplateEntry | null>(null)
const effectiveFrom = ref<string>('')
const effectiveTo = ref<string>('')
const note = ref<string>('')

watch(
  () => props.isOpen,
  open => {
    if (!open) return
    const firstDorm = dormitoryStore.dormitories[0]
    entry.value = {
      target: { kind: 'dormitory', dormitoryName: firstDorm?.dormitoryName ?? '' },
      change: { attr: 'active', value: false },
    }
    effectiveFrom.value = todayIso()
    effectiveTo.value = ''
    note.value = ''
  },
  { immediate: true }
)

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateError = computed<string | null>(() => {
  if (!effectiveFrom.value) return 'Pick a "From" date.'
  if (effectiveTo.value && effectiveTo.value < effectiveFrom.value) return '"To" must be on or after "From".'
  return null
})

const canApply = computed(() => !!entry.value && !dateError.value)

function apply() {
  if (!entry.value || !canApply.value) return
  dormitoryStore.addOverride({
    target: entry.value.target,
    change: entry.value.change,
    effectiveFrom: effectiveFrom.value,
    effectiveTo: effectiveTo.value || null,
    note: note.value.trim() || undefined,
  })
  emit('close')
}

function cancel() {
  emit('close')
}
</script>

<style scoped lang="scss">
.form { display: flex; flex-direction: column; gap: 14px; }
.hint { margin: 0; font-size: 0.85rem; color: #6b7280; }
.date-row { display: flex; gap: 12px; .field { flex: 1; } }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.8rem; font-weight: 500; color: #374151; }
input[type="text"], input[type="date"] {
  padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;
}
.warning-banner { padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; }
.warning-banner.error { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 4px; font-size: 0.9rem; cursor: pointer; }
.btn:hover { background: #f3f4f6; }
.btn.btn-primary { background: #4f46e5; color: white; border-color: #4f46e5; }
.btn.btn-primary:hover { background: #4338ca; }
.btn.btn-primary:disabled { background: #c7d2fe; cursor: not-allowed; }
</style>
