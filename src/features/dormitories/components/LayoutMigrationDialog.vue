<template>
  <Modal :model-value="isOpen" title="Move to the new override model" max-width="720px" :close-on-backdrop="false" :show-close="false" @update:model-value="() => {}">
    <div class="form">
      <p class="intro">
        You have <strong>{{ layouts.length }} saved layouts</strong>. The app now uses a single
        <strong>base configuration</strong> plus dated <strong>overrides</strong> — same property,
        time-aware changes, no more clearing assignments when you switch.
      </p>

      <p class="intro">
        Pick which of your saved layouts should become the base. The others will be converted into
        <em>presets</em> you can apply to a date range later.
      </p>

      <div class="layouts">
        <label v-for="layout in layouts" :key="layout.id" class="layout-row">
          <input type="radio" :value="layout.id" v-model="basePick" />
          <div class="layout-info">
            <strong>{{ layout.name }}</strong>
            <span v-if="layout.id === activeLayoutId" class="active-badge">currently active</span>
            <span class="layout-meta">{{ layoutSummary(layout) }}</span>
          </div>
        </label>
      </div>

      <div v-if="basePick" class="preview">
        <h4>Conversion preview</h4>
        <div v-if="payloads.length === 0" class="preview-empty">
          The other layouts are identical to the base — nothing to convert, they'll just be dropped.
        </div>
        <div v-else>
          <div v-for="p in payloads" :key="p.sourceLayout.id" class="preview-layout">
            <div class="preview-layout-header">
              <strong>{{ p.sourceLayout.name }}</strong>
              <span class="preview-count">{{ p.diff.entries.length }} change{{ p.diff.entries.length === 1 ? '' : 's' }}</span>
            </div>
            <ul v-if="p.diff.entries.length > 0" class="entry-list">
              <li v-for="(e, i) in p.diff.entries" :key="i">
                {{ targetLabel(e.target) }} → {{ changeLabel(e.change) }}
              </li>
            </ul>
            <ul v-if="p.diff.structuralWarnings.length > 0" class="warning-list">
              <li v-for="(w, i) in p.diff.structuralWarnings" :key="i">⚠ {{ w }}</li>
            </ul>
          </div>
        </div>
      </div>

      <details class="advanced">
        <summary>I want to handle this manually</summary>
        <p class="advanced-body">
          Dismiss the dialog and keep the legacy layout selector visible. You can come back to this
          migration later by clearing the <code>dormAssignments-dormitories.layoutMigrationComplete</code>
          flag in localStorage.
        </p>
        <button class="btn" @click="dismissWithoutMigrating">Dismiss for now</button>
      </details>
    </div>

    <template #footer>
      <button class="btn btn-primary" :disabled="!basePick" @click="confirm">
        Convert to base + {{ payloads.length }} preset{{ payloads.length === 1 ? '' : 's' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import {
  buildPresetPayloadsFromLayouts,
} from '../composables/useLayoutDiff'
import type { RoomLayout, OverrideTarget, OverrideAttribute } from '@/types'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()

const layouts = computed(() => dormitoryStore.layouts)
const activeLayoutId = computed(() => dormitoryStore.activeLayoutId)

const basePick = ref<string>('')

watch(
  () => props.isOpen,
  open => {
    if (open) basePick.value = activeLayoutId.value ?? layouts.value[0]?.id ?? ''
  },
  { immediate: true }
)

const pickedLayout = computed<RoomLayout | null>(() => {
  return layouts.value.find(l => l.id === basePick.value) ?? null
})

const payloads = computed(() => {
  const base = pickedLayout.value
  if (!base) return []
  return buildPresetPayloadsFromLayouts(base, layouts.value)
})

function layoutSummary(layout: RoomLayout): string {
  const dormCount = layout.dormitories.length
  const roomCount = layout.dormitories.reduce((acc, d) => acc + d.rooms.length, 0)
  const bedCount = layout.dormitories.reduce(
    (acc, d) => acc + d.rooms.reduce((rAcc, r) => rAcc + r.beds.length, 0),
    0
  )
  return `${dormCount} dorm${dormCount === 1 ? '' : 's'} · ${roomCount} room${roomCount === 1 ? '' : 's'} · ${bedCount} bed${bedCount === 1 ? '' : 's'}`
}

function targetLabel(t: OverrideTarget): string {
  if (t.kind === 'dormitory') return `Dormitory ${t.dormitoryName}`
  if (t.kind === 'room') return `Room ${t.dormitoryName} / ${t.roomName}`
  return `Bed ${t.bedId}`
}

function changeLabel(c: OverrideAttribute): string {
  if (c.attr === 'active') return c.value ? 'Open' : 'Closed'
  return `Gender: ${c.value}`
}

function confirm() {
  const base = pickedLayout.value
  if (!base) return
  // 1. Promote the picked layout's snapshot to the working dormitories.
  dormitoryStore.importDormitories(JSON.parse(JSON.stringify(base.dormitories)))
  dormitoryStore.configName = base.name

  // 2. Create one preset per non-empty payload.
  for (const p of payloads.value) {
    dormitoryStore.addPreset({
      name: p.sourceLayout.name,
      description: p.sourceLayout.description || undefined,
      entries: p.diff.entries,
    })
  }

  // 3. Mark migration complete + drop the now-redundant layouts list.
  //    Keep activeLayoutId so legacy code paths that still read it
  //    won't crash; effective behavior is "single layout = base".
  dormitoryStore.layouts = [base]
  dormitoryStore.activeLayoutId = base.id
  dormitoryStore.layoutMigrationComplete = true

  emit('close')
}

function dismissWithoutMigrating() {
  // Leave layouts intact, just hide the dialog this session. The next
  // mount will surface it again until they pick a base.
  emit('close')
}
</script>

<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.intro {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.4;
}

.layouts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layout-row {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  align-items: flex-start;

  &:has(input:checked) {
    border-color: #4f46e5;
    background: #eef2ff;
  }

  input[type="radio"] {
    margin-top: 2px;
  }

  .layout-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .active-badge {
    font-size: 0.7rem;
    color: #166534;
    background: #dcfce7;
    padding: 1px 6px;
    border-radius: 8px;
    align-self: flex-start;
  }

  .layout-meta {
    font-size: 0.75rem;
    color: #6b7280;
  }
}

.preview {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px 14px;
  background: #f9fafb;

  h4 {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
    color: #374151;
  }

  .preview-empty {
    font-size: 0.85rem;
    color: #6b7280;
  }

  .preview-layout {
    margin-bottom: 10px;

    &:last-child { margin-bottom: 0; }
  }

  .preview-layout-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .preview-count {
    font-size: 0.75rem;
    color: #6b7280;
    background: white;
    padding: 1px 6px;
    border-radius: 8px;
  }

  .entry-list,
  .warning-list {
    margin: 0 0 4px 0;
    padding-left: 18px;
    font-size: 0.8rem;
  }

  .entry-list li { color: #374151; }
  .warning-list li { color: #92400e; }
}

.advanced {
  font-size: 0.85rem;
  color: #6b7280;

  summary {
    cursor: pointer;
    user-select: none;

    &:hover { color: #1f2937; }
  }

  .advanced-body {
    margin: 8px 0;
    line-height: 1.4;

    code {
      background: #f3f4f6;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.75rem;
    }
  }
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
