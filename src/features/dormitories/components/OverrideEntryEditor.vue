<template>
  <div class="entry-row">
    <select v-model="kind" class="kind-select">
      <option value="dormitory">Dormitory</option>
      <option value="room">Room</option>
      <option value="bed">Bed</option>
    </select>

    <select v-model="targetKey" class="target-select">
      <option value="" disabled>Pick a {{ kind }}…</option>
      <option v-for="opt in targetOptions" :key="opt.key" :value="opt.key">
        {{ opt.label }}
      </option>
    </select>

    <span class="separator">→</span>

    <select v-model="attr" class="attr-select">
      <option value="active">{{ kind === 'room' ? 'Open / Closed' : 'Open / Closed' }}</option>
      <option v-if="kind === 'room'" value="gender">Gender</option>
    </select>

    <select v-if="attr === 'active'" v-model="activeValue" class="value-select">
      <option :value="true">Open</option>
      <option :value="false">Closed</option>
    </select>

    <select v-else-if="attr === 'gender'" v-model="genderValue" class="value-select">
      <option value="M">M</option>
      <option value="F">F</option>
      <option value="Coed">Coed</option>
    </select>

    <button v-if="removable" type="button" class="remove-btn" @click="$emit('remove')" title="Remove entry">×</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { OverrideTarget, OverrideAttribute, RoomGender, PresetTemplateEntry } from '@/types'

interface Props {
  modelValue: PresetTemplateEntry | null
  removable?: boolean
}

const props = withDefaults(defineProps<Props>(), { removable: true })
const emit = defineEmits<{
  'update:modelValue': [value: PresetTemplateEntry]
  remove: []
}>()

const dormitoryStore = useDormitoryStore()

const kind = ref<'dormitory' | 'room' | 'bed'>(props.modelValue?.target.kind ?? 'dormitory')
const targetKey = ref<string>(initialTargetKey())
const attr = ref<'active' | 'gender'>(props.modelValue?.change.attr ?? 'active')
const activeValue = ref<boolean>(
  props.modelValue?.change.attr === 'active' ? props.modelValue.change.value : false
)
const genderValue = ref<RoomGender>(
  props.modelValue?.change.attr === 'gender' ? props.modelValue.change.value : 'Coed'
)

function initialTargetKey(): string {
  const t = props.modelValue?.target
  if (!t) return ''
  if (t.kind === 'dormitory') return `dorm::${t.dormitoryName}`
  if (t.kind === 'room') return `room::${t.dormitoryName}::${t.roomName}`
  return `bed::${t.bedId}`
}

const targetOptions = computed(() => {
  const out: { key: string; label: string }[] = []
  if (kind.value === 'dormitory') {
    for (const d of dormitoryStore.dormitories) {
      out.push({ key: `dorm::${d.dormitoryName}`, label: d.dormitoryName })
    }
  } else if (kind.value === 'room') {
    for (const d of dormitoryStore.dormitories) {
      for (const r of d.rooms) {
        out.push({
          key: `room::${d.dormitoryName}::${r.roomName}`,
          label: `${d.dormitoryName} — ${r.roomName}`,
        })
      }
    }
  } else {
    for (const d of dormitoryStore.dormitories) {
      for (const r of d.rooms) {
        for (const b of r.beds) {
          out.push({
            key: `bed::${b.bedId}`,
            label: `${b.bedId} (${d.dormitoryName} / ${r.roomName})`,
          })
        }
      }
    }
  }
  return out
})

// When kind changes, clear the specific target (it likely no longer matches).
watch(kind, () => {
  targetKey.value = ''
  // Room is the only kind that allows the gender attr; reset if needed.
  if (kind.value !== 'room' && attr.value === 'gender') attr.value = 'active'
})

function parseTargetKey(key: string): OverrideTarget | null {
  if (!key) return null
  const parts = key.split('::')
  if (parts[0] === 'dorm') return { kind: 'dormitory', dormitoryName: parts[1] }
  if (parts[0] === 'room') return { kind: 'room', dormitoryName: parts[1], roomName: parts[2] }
  if (parts[0] === 'bed') return { kind: 'bed', bedId: parts[1] }
  return null
}

watch(
  [kind, targetKey, attr, activeValue, genderValue],
  () => {
    const target = parseTargetKey(targetKey.value)
    if (!target) return
    let change: OverrideAttribute
    if (attr.value === 'active') {
      change = { attr: 'active', value: activeValue.value }
    } else {
      change = { attr: 'gender', value: genderValue.value }
    }
    emit('update:modelValue', { target, change })
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
.entry-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
}

select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 0.85rem;
}

.kind-select { min-width: 100px; }
.target-select { min-width: 200px; flex: 1; }
.attr-select { min-width: 120px; }
.value-select { min-width: 80px; }

.separator {
  color: #6b7280;
  font-weight: 500;
}

.remove-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #ef4444;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 6px;
  border-radius: 4px;

  &:hover { background: #fee2e2; }
}
</style>
