<template>
  <section class="presets-overrides">
    <header class="section-header">
      <h3>Time-based overrides</h3>
      <p class="section-hint">Define dated changes to the base layout. Use <strong>presets</strong> for repeating retreat configurations and <strong>one-off overrides</strong> for last-minute tweaks. Effective on the View Date in Table View.</p>
    </header>

    <!-- Presets -->
    <div class="card">
      <div class="card-header">
        <h4>Presets</h4>
        <button class="btn-small" @click="openNewPreset">+ New preset</button>
      </div>
      <div v-if="presets.length === 0" class="empty">
        No presets yet. Create one for repeating layouts (e.g. "Women's Retreat", "Winter Mode").
      </div>
      <ul v-else class="preset-list">
        <li v-for="preset in presets" :key="preset.id">
          <div class="preset-row">
            <div class="preset-main">
              <strong>{{ preset.name }}</strong>
              <span class="preset-desc" v-if="preset.description">— {{ preset.description }}</span>
              <span class="preset-meta">{{ preset.entries.length }} change{{ preset.entries.length === 1 ? '' : 's' }}</span>
            </div>
            <div class="preset-actions">
              <button class="btn-small" @click="openApply(preset)" :disabled="preset.entries.length === 0">Apply…</button>
              <button class="btn-small" @click="openEdit(preset)">Edit</button>
              <button class="btn-small btn-danger" @click="confirmDeletePreset(preset)">Delete</button>
            </div>
          </div>
          <ul v-if="applicationsForPreset(preset.id).length > 0" class="applications">
            <li v-for="app in applicationsForPreset(preset.id)" :key="app.applicationId">
              <span class="app-window">{{ formatDate(app.effectiveFrom) }} → {{ app.effectiveTo ? formatDate(app.effectiveTo) : '∞' }}</span>
              <span class="app-count">({{ app.count }} override{{ app.count === 1 ? '' : 's' }})</span>
              <button class="btn-mini btn-danger" @click="revertApplication(app.applicationId, preset.name)">Revert</button>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- Overrides timeline -->
    <div class="card">
      <div class="card-header">
        <h4>All overrides</h4>
        <button class="btn-small" @click="openOneOff">+ Add one-off</button>
      </div>
      <div v-if="overrides.length === 0" class="empty">
        No overrides yet.
      </div>
      <ul v-else class="overrides-list">
        <li v-for="o in sortedOverrides" :key="o.id" class="override-row">
          <span class="window">{{ formatDate(o.effectiveFrom) }} → {{ o.effectiveTo ? formatDate(o.effectiveTo) : '∞' }}</span>
          <span class="target">{{ targetLabel(o.target) }}</span>
          <span class="separator">→</span>
          <span class="change">{{ changeLabel(o.change) }}</span>
          <span v-if="o.presetId" class="source preset-source" :title="presetNameFor(o.presetId) ?? ''">
            from preset: {{ presetNameFor(o.presetId) ?? '(deleted)' }}
          </span>
          <span v-else class="source oneoff-source">one-off</span>
          <span v-if="o.note" class="note" :title="o.note">📝</span>
          <button class="btn-mini btn-danger" @click="deleteOverride(o.id)" title="Delete this override">×</button>
        </li>
      </ul>
    </div>

    <PresetEditModal :is-open="editModalOpen" :preset="editTarget" @close="editModalOpen = false" />
    <ApplyPresetModal :is-open="applyModalOpen" :preset="applyTarget" @close="applyModalOpen = false" />
    <OneOffOverrideModal :is-open="oneOffModalOpen" @close="oneOffModalOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import PresetEditModal from './PresetEditModal.vue'
import ApplyPresetModal from './ApplyPresetModal.vue'
import OneOffOverrideModal from './OneOffOverrideModal.vue'
import type { OverridePreset, OverrideTarget, OverrideAttribute } from '@/types'

const dormitoryStore = useDormitoryStore()

const presets = computed(() => dormitoryStore.presets)
const overrides = computed(() => dormitoryStore.overrides)

const sortedOverrides = computed(() => {
  return [...overrides.value].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
})

const editModalOpen = ref(false)
const editTarget = ref<OverridePreset | null>(null)
const applyModalOpen = ref(false)
const applyTarget = ref<OverridePreset | null>(null)
const oneOffModalOpen = ref(false)

function openNewPreset() {
  editTarget.value = null
  editModalOpen.value = true
}

function openEdit(preset: OverridePreset) {
  editTarget.value = preset
  editModalOpen.value = true
}

function openApply(preset: OverridePreset) {
  applyTarget.value = preset
  applyModalOpen.value = true
}

function openOneOff() {
  oneOffModalOpen.value = true
}

function confirmDeletePreset(preset: OverridePreset) {
  const applied = applicationsForPreset(preset.id).length
  const msg = applied > 0
    ? `Delete preset "${preset.name}"? This will also delete ${applied} applied window${applied === 1 ? '' : 's'} (every override sourced from this preset).`
    : `Delete preset "${preset.name}"?`
  if (window.confirm(msg)) {
    dormitoryStore.deletePreset(preset.id)
  }
}

function deleteOverride(id: string) {
  if (window.confirm('Delete this override?')) dormitoryStore.deleteOverride(id)
}

function revertApplication(applicationId: string, presetName: string) {
  if (window.confirm(`Revert this application of "${presetName}"? All overrides from this window will be deleted.`)) {
    dormitoryStore.revertPresetApplication(applicationId)
  }
}

interface PresetApplication {
  applicationId: string
  effectiveFrom: string
  effectiveTo: string | null
  count: number
}

/**
 * Group overrides by applicationId so each "this preset was applied for
 * Jul 4 → Jul 11" surfaces as one revertable row. Same preset applied to
 * multiple non-overlapping windows shows multiple rows.
 */
function applicationsForPreset(presetId: string): PresetApplication[] {
  const byApp = new Map<string, PresetApplication>()
  for (const o of overrides.value) {
    if (o.presetId !== presetId || !o.applicationId) continue
    const existing = byApp.get(o.applicationId)
    if (existing) {
      existing.count++
    } else {
      byApp.set(o.applicationId, {
        applicationId: o.applicationId,
        effectiveFrom: o.effectiveFrom,
        effectiveTo: o.effectiveTo,
        count: 1,
      })
    }
  }
  return [...byApp.values()].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
}

function presetNameFor(presetId: string): string | null {
  return presets.value.find(p => p.id === presetId)?.name ?? null
}

function targetLabel(t: OverrideTarget): string {
  if (t.kind === 'dormitory') return `Dormitory: ${t.dormitoryName}`
  if (t.kind === 'room') return `Room: ${t.dormitoryName} / ${t.roomName}`
  return `Bed: ${t.bedId}`
}

function changeLabel(c: OverrideAttribute): string {
  if (c.attr === 'active') return c.value ? 'Open' : 'Closed'
  return `Gender: ${c.value}`
}

function formatDate(iso: string): string {
  // Render YYYY-MM-DD as "Mon DD" or "Mon DD, YYYY" if year differs from current.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}
</script>

<style scoped lang="scss">
.presets-overrides {
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  h3 {
    margin: 0 0 4px 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .section-hint {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
  }
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;

  h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #374151;
  }
}

.empty {
  padding: 16px;
  font-size: 0.85rem;
  color: #6b7280;
  text-align: center;
}

.preset-list,
.overrides-list,
.applications {
  list-style: none;
  margin: 0;
  padding: 0;
}

.preset-list > li {
  padding: 10px 16px;
  border-bottom: 1px solid #f3f4f6;

  &:last-child { border-bottom: none; }
}

.preset-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preset-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;

  .preset-desc {
    font-size: 0.85rem;
    color: #6b7280;
  }

  .preset-meta {
    font-size: 0.75rem;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 1px 6px;
    border-radius: 8px;
  }
}

.preset-actions {
  display: flex;
  gap: 6px;
}

.applications {
  margin-top: 6px;
  padding: 6px 10px;
  background: #fef3c7;
  border-radius: 4px;
  font-size: 0.8rem;

  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: #92400e;
  }

  .app-window {
    font-weight: 500;
  }

  .app-count {
    color: #b45309;
  }
}

.override-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;

  &:last-child { border-bottom: none; }

  .window {
    color: #374151;
    font-weight: 500;
    min-width: 180px;
  }

  .target {
    color: #1f2937;
  }

  .separator {
    color: #9ca3af;
  }

  .change {
    color: #4f46e5;
    font-weight: 500;
  }

  .source {
    margin-left: auto;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 10px;

    &.preset-source {
      background: #ede9fe;
      color: #6d28d9;
    }

    &.oneoff-source {
      background: #f3f4f6;
      color: #6b7280;
    }
  }

  .note {
    cursor: help;
  }
}

.btn-small {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: #f3f4f6; }

  &:disabled {
    color: #9ca3af;
    cursor: not-allowed;
    background: #f9fafb;
  }

  &.btn-danger {
    color: #b91c1c;
    border-color: #fca5a5;

    &:hover { background: #fee2e2; }
  }
}

.btn-mini {
  padding: 2px 8px;
  font-size: 0.75rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1;

  &:hover { background: #f3f4f6; }

  &.btn-danger {
    color: #b91c1c;
    border-color: #fca5a5;

    &:hover { background: #fee2e2; }
  }
}
</style>
