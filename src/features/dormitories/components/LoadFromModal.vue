<template>
  <Modal :model-value="isOpen" title="Load snapshot into this configuration" max-width="520px" @update:model-value="(v) => !v && cancel()">
    <div class="form">
      <p class="hint">
        This <strong>replaces</strong> the currently editing configuration's snapshot with the one you pick. The window (date range) stays the same — only the dormitory tree is overwritten.
      </p>

      <div class="field">
        <span class="field-label">Source</span>
        <div class="source-options">
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

      <div v-if="targetHasContent" class="warning-banner">
        ⚠ The current configuration is not empty — loading will overwrite its dorms / rooms / beds.
      </div>
    </div>

    <template #footer>
      <button class="btn" @click="cancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!canCommit" @click="commit">
        {{ targetHasContent ? 'Overwrite' : 'Load' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'

interface Props {
  isOpen: boolean
  /** The configuration whose snapshot will be replaced. */
  targetConfigurationId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()

const source = ref<'copyFrom' | 'template'>('copyFrom')
const copyFromId = ref('')
const templateId = ref('')

watch(
  () => props.isOpen,
  open => {
    if (!open) return
    // Default to whichever is available first.
    source.value = dormitoryStore.configurations.length > 1 ? 'copyFrom' : 'template'
    copyFromId.value = ''
    templateId.value = ''
  },
  { immediate: true }
)

const otherConfigurations = computed(() => {
  return dormitoryStore.configurations.filter(c => c.id !== props.targetConfigurationId)
})
const templates = computed(() => dormitoryStore.configurationTemplates)

const targetHasContent = computed<boolean>(() => {
  if (!props.targetConfigurationId) return false
  const c = dormitoryStore.configurations.find(x => x.id === props.targetConfigurationId)
  if (!c) return false
  return c.dormitories.length > 0
})

const canCommit = computed(() => {
  if (!props.targetConfigurationId) return false
  if (source.value === 'copyFrom') return !!copyFromId.value
  return !!templateId.value
})

function commit() {
  if (!canCommit.value || !props.targetConfigurationId) return

  let sourceDorms = null
  if (source.value === 'copyFrom') {
    const src = dormitoryStore.configurations.find(c => c.id === copyFromId.value)
    if (src) sourceDorms = src.dormitories
  } else {
    const tpl = dormitoryStore.configurationTemplates.find(t => t.id === templateId.value)
    if (tpl) sourceDorms = tpl.dormitories
  }
  if (!sourceDorms) return

  if (targetHasContent.value) {
    if (!window.confirm('This replaces the current configuration\'s dormitories, rooms, and beds with the picked source. The change can be undone only by editing again — proceed?')) {
      return
    }
  }

  dormitoryStore.updateConfigurationDormitories(props.targetConfigurationId, sourceDorms)
  // Re-select to force the watcher to reload the working `dormitories` ref
  // from the newly-replaced snapshot.
  dormitoryStore.selectConfiguration(props.targetConfigurationId)
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
select.sub-select {
  padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;
  max-width: 320px; margin-left: 24px;
}
.source-options {
  display: flex; flex-direction: column; gap: 6px;
  .source-option {
    display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #374151;
    input[type="radio"]:disabled + span { color: #9ca3af; }
  }
}
.warning-banner {
  padding: 8px 12px; background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 6px; color: #92400e; font-size: 0.85rem;
}
.btn { padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 4px; font-size: 0.9rem; cursor: pointer; }
.btn:hover { background: #f3f4f6; }
.btn.btn-primary { background: #4f46e5; color: white; border-color: #4f46e5; }
.btn.btn-primary:hover { background: #4338ca; }
.btn.btn-primary:disabled { background: #c7d2fe; cursor: not-allowed; }
</style>
