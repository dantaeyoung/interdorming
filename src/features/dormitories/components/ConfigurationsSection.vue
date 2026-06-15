<template>
  <section class="configurations">
    <header class="section-header">
      <h3>Time-based configurations</h3>
      <p class="section-hint">
        The timeline is a sequence of configurations. Add a <strong>cut</strong> to split it; the new segment starts as a copy of the previous one and you edit it independently. Save any configuration as a <strong>template</strong> for reuse.
      </p>
    </header>

    <ConfigurationTimelineBar />

    <div v-if="selectedConfiguration" class="editing-bar">
      <div class="editing-info">
        <strong>Editing:</strong>
        <span class="editing-name">{{ selectedConfiguration.name }}</span>
        <span class="editing-window">{{ formatWindow(selectedConfiguration) }}</span>
      </div>
      <div class="editing-actions">
        <button class="btn-small" @click="rename">Rename</button>
        <button class="btn-small" @click="saveAsTemplate">Save as template…</button>
        <button v-if="selectedConfiguration.effectiveFrom !== null" class="btn-small btn-danger" @click="deleteCurrentCut">
          Delete this cut
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h4>Templates</h4>
        <span class="card-hint">Save any configuration as a template, then paste it as a future cut.</span>
      </div>
      <div v-if="templates.length === 0" class="empty">
        No templates yet. Click <em>Save as template</em> on a configuration above to start.
      </div>
      <ul v-else class="template-list">
        <li v-for="t in templates" :key="t.id" class="template-row">
          <strong>{{ t.name }}</strong>
          <span v-if="t.description" class="template-desc">— {{ t.description }}</span>
          <button class="btn-small" @click="renameTemplate(t.id, t.name)">Rename</button>
          <button class="btn-small btn-danger" @click="deleteTemplate(t.id)">Delete</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import ConfigurationTimelineBar from './ConfigurationTimelineBar.vue'
import type { TimelineConfiguration } from '@/types'

const dormitoryStore = useDormitoryStore()

const templates = computed(() => dormitoryStore.configurationTemplates)
const selectedConfiguration = computed<TimelineConfiguration | null>(() => {
  const id = dormitoryStore.selectedConfigurationId
  if (!id) return null
  return dormitoryStore.configurations.find(c => c.id === id) ?? null
})

function rename() {
  if (!selectedConfiguration.value) return
  const next = window.prompt('Rename configuration:', selectedConfiguration.value.name)
  if (!next?.trim()) return
  dormitoryStore.renameConfiguration(selectedConfiguration.value.id, next.trim())
}

function saveAsTemplate() {
  if (!selectedConfiguration.value) return
  const name = window.prompt('Save as template — name:', selectedConfiguration.value.name)
  if (!name?.trim()) return
  dormitoryStore.saveConfigurationAsTemplate(selectedConfiguration.value.id, name.trim())
}

function deleteCurrentCut() {
  if (!selectedConfiguration.value) return
  const c = selectedConfiguration.value
  if (!window.confirm(`Delete the cut for "${c.name}"? Its snapshot is discarded; the previous configuration's window extends to the next cut.`)) return
  dormitoryStore.deleteCut(c.id)
}

function renameTemplate(id: string, currentName: string) {
  const next = window.prompt('Rename template:', currentName)
  if (!next?.trim()) return
  dormitoryStore.renameConfigurationTemplate(id, next.trim())
}

function deleteTemplate(id: string) {
  if (!window.confirm('Delete this template?')) return
  dormitoryStore.deleteConfigurationTemplate(id)
}

function formatWindow(c: TimelineConfiguration): string {
  const cfgs = [...dormitoryStore.configurations].sort((a, b) => {
    if (a.effectiveFrom === b.effectiveFrom) return 0
    if (a.effectiveFrom === null) return -1
    if (b.effectiveFrom === null) return 1
    return a.effectiveFrom < b.effectiveFrom ? -1 : 1
  })
  const idx = cfgs.findIndex(x => x.id === c.id)
  const next = cfgs[idx + 1]
  const start = c.effectiveFrom ? formatDate(c.effectiveFrom) : 'forever before'
  const end = next?.effectiveFrom ? formatDate(addDays(next.effectiveFrom, -1)) : 'forever after'
  return `(${start} → ${end})`
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.configurations { padding: 0 16px 24px; display: flex; flex-direction: column; gap: 16px; }
.section-header {
  h3 { margin: 0 0 4px 0; font-size: 1.125rem; font-weight: 600; color: #1f2937; }
  .section-hint { margin: 0; font-size: 0.85rem; color: #6b7280; line-height: 1.4; }
}
.editing-bar {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
  padding: 8px 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px;
  .editing-info { display: flex; align-items: baseline; gap: 6px; font-size: 0.85rem; }
  .editing-name { color: #4f46e5; font-weight: 500; }
  .editing-window { color: #6b7280; font-size: 0.75rem; }
  .editing-actions { display: flex; gap: 6px; }
}
.card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.card-header {
  padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;
  display: flex; flex-direction: column; gap: 2px;
  h4 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #374151; }
  .card-hint { font-size: 0.75rem; color: #6b7280; }
}
.empty { padding: 16px; font-size: 0.85rem; color: #6b7280; text-align: center; }
.template-list { list-style: none; padding: 0; margin: 0; }
.template-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6; font-size: 0.85rem;
  &:last-child { border-bottom: none; }
  .template-desc { color: #6b7280; flex: 1; }
}
.btn-small {
  padding: 4px 10px; font-size: 0.8rem; border: 1px solid #d1d5db;
  background: white; border-radius: 4px; cursor: pointer; white-space: nowrap;
  &:hover { background: #f3f4f6; }
  &.btn-danger { color: #b91c1c; border-color: #fca5a5; &:hover { background: #fee2e2; } }
}
</style>
