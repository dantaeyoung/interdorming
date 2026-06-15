<template>
  <Modal :model-value="isOpen" title="Add a cut" max-width="520px" @update:model-value="(v) => !v && cancel()">
    <div class="form">
      <p class="hint">
        A cut splits the timeline. The new segment starts on the date you pick and runs forward until the next cut (or forever). It begins as a copy of an existing configuration — you can edit it independently.
      </p>

      <label class="field">
        <span class="field-label">Date</span>
        <input type="date" v-model="effectiveFrom" />
      </label>

      <label class="field">
        <span class="field-label">Name (optional)</span>
        <input type="text" v-model="name" placeholder="e.g. Women's Retreat" />
      </label>

      <div class="field">
        <span class="field-label">Start from</span>
        <div class="source-options">
          <label class="source-option">
            <input type="radio" v-model="source" value="current" />
            <span>Empty copy of the current configuration on that date</span>
          </label>
          <label class="source-option">
            <input type="radio" v-model="source" value="copyFrom" :disabled="otherConfigurations.length === 0" />
            <span>Copy from another configuration on the timeline</span>
          </label>
          <select v-if="source === 'copyFrom'" v-model="copyFromId" class="sub-select">
            <option value="" disabled>Pick a configuration…</option>
            <option v-for="c in otherConfigurations" :key="c.id" :value="c.id">
              {{ c.name }} <span v-if="c.effectiveFrom">({{ formatDate(c.effectiveFrom) }})</span>
            </option>
          </select>

          <label class="source-option">
            <input type="radio" v-model="source" value="template" :disabled="templates.length === 0" />
            <span>Use a template</span>
          </label>
          <select v-if="source === 'template'" v-model="templateId" class="sub-select">
            <option value="" disabled>Pick a template…</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="dateError" class="warning">{{ dateError }}</div>
    </div>

    <template #footer>
      <button class="btn" @click="cancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!canCommit" @click="commit">Add cut</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'

interface Props {
  isOpen: boolean
  initialDate?: string | null
}

const props = withDefaults(defineProps<Props>(), { initialDate: null })
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()

const effectiveFrom = ref('')
const name = ref('')
const source = ref<'current' | 'copyFrom' | 'template'>('current')
const copyFromId = ref('')
const templateId = ref('')

watch(
  () => props.isOpen,
  open => {
    if (!open) return
    effectiveFrom.value = props.initialDate ?? todayIso()
    name.value = ''
    source.value = 'current'
    copyFromId.value = ''
    templateId.value = ''
  },
  { immediate: true }
)

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const otherConfigurations = computed(() => {
  return dormitoryStore.configurations.filter(c => c.effectiveFrom !== effectiveFrom.value)
})
const templates = computed(() => dormitoryStore.configurationTemplates)

const dateError = computed<string | null>(() => {
  if (!effectiveFrom.value) return 'Pick a date.'
  const existing = dormitoryStore.configurations.find(c => c.effectiveFrom === effectiveFrom.value)
  if (existing) return `A cut already exists on ${formatDate(effectiveFrom.value)}.`
  return null
})

const canCommit = computed(() => {
  if (dateError.value) return false
  if (source.value === 'copyFrom' && !copyFromId.value) return false
  if (source.value === 'template' && !templateId.value) return false
  return true
})

function commit() {
  if (!canCommit.value) return
  const opts: { name?: string; copyFrom?: string; templateId?: string } = {}
  if (name.value.trim()) opts.name = name.value.trim()
  if (source.value === 'copyFrom') opts.copyFrom = copyFromId.value
  if (source.value === 'template') opts.templateId = templateId.value
  const created = dormitoryStore.cutAt(effectiveFrom.value, opts)
  if (created) {
    // Immediately select the new segment so the operator can edit it.
    dormitoryStore.selectConfiguration(created.id)
  }
  emit('close')
}

function cancel() {
  emit('close')
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}
</script>

<style scoped lang="scss">
.form { display: flex; flex-direction: column; gap: 14px; }
.hint { margin: 0; font-size: 0.85rem; color: #6b7280; line-height: 1.4; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 0.8rem; font-weight: 500; color: #374151; }
input[type="text"], input[type="date"], select.sub-select {
  padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;
}
.source-options {
  display: flex; flex-direction: column; gap: 6px;
  .source-option {
    display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #374151;
    input[type="radio"]:disabled + span { color: #9ca3af; }
  }
  .sub-select { margin-left: 24px; max-width: 320px; }
}
.warning {
  padding: 8px 12px; background: #fee2e2; border: 1px solid #fca5a5;
  border-radius: 6px; color: #991b1b; font-size: 0.85rem;
}
.btn { padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 4px; font-size: 0.9rem; cursor: pointer; }
.btn:hover { background: #f3f4f6; }
.btn.btn-primary { background: #4f46e5; color: white; border-color: #4f46e5; }
.btn.btn-primary:hover { background: #4338ca; }
.btn.btn-primary:disabled { background: #c7d2fe; cursor: not-allowed; }
</style>
