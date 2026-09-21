<template>
  <div class="timeline-card">
    <div class="card-header">
      <div class="header-left">
        <h4>Configuration timeline</h4>
        <span class="header-hint">Click a segment to inspect or edit the overrides in it.</span>
      </div>
      <button class="btn-small" @click="openAddOneOff()">+ Add one-off</button>
    </div>

    <div class="controls">
      <label class="field">
        <span class="field-label">From</span>
        <input type="date" :value="rangeStart" @change="onStartChange" />
      </label>
      <label class="field">
        <span class="field-label">To</span>
        <input type="date" :value="rangeEnd" @change="onEndChange" />
      </label>
      <button class="btn-small" @click="resetRange" title="Reset to current month ± 6 months">Reset range</button>
    </div>

    <div v-if="rangeStart > rangeEnd" class="warning">
      "From" must be on or before "To".
    </div>

    <div v-else class="bar-wrapper">
      <div class="bar" role="list">
        <button
          v-for="(seg, idx) in segments"
          :key="seg.start"
          :style="{ flexGrow: seg.durationDays, background: seg.color }"
          :class="['segment', { 'is-selected': selectedSignature === segmentKey(seg) }]"
          role="listitem"
          :title="edgeTooltip(seg, idx)"
          @click="selectSegment(seg)"
        >
          <span v-if="idx === 0" class="edge-marker leading" aria-hidden="true">←</span>
          <span class="segment-label">
            {{ seg.label }}<span v-if="seg.extraOneOffCount > 0" class="extra-badge">+{{ seg.extraOneOffCount }}</span>
          </span>
          <span v-if="idx === segments.length - 1" class="edge-marker trailing" aria-hidden="true">→</span>
        </button>
        <div
          v-if="todayOffset !== null"
          class="today-indicator"
          :style="{ left: todayOffset + '%' }"
          title="Today"
        />
      </div>
      <div class="axis">
        <span class="axis-tick">{{ formatTick(rangeStart) }}</span>
        <span class="axis-tick">{{ formatTick(rangeEnd) }}</span>
      </div>
    </div>

    <div v-if="legend.length > 1" class="legend">
      <div v-for="item in legend" :key="item.signature || 'default'" class="legend-chip">
        <span class="legend-swatch" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- Selected segment panel -->
    <div v-if="selectedSegment" class="selected-panel">
      <div class="selected-header">
        <div class="selected-title">
          <strong>{{ selectedSegment.label }}</strong>
          <span v-if="selectedSegment.extraOneOffCount > 0" class="extra-badge">+{{ selectedSegment.extraOneOffCount }}</span>
          <span class="selected-range">{{ formatDate(selectedSegment.start) }} → {{ formatDate(selectedSegment.end) }}</span>
        </div>
        <button class="btn-mini" @click="selectedSignature = null" title="Close panel">×</button>
      </div>

      <div v-if="selectedActiveOverrides.length === 0" class="selected-empty">
        Base configuration — no overrides active in this segment.
        <button class="btn-small" @click="openAddOneOff(selectedSegment.start)">+ Add override starting {{ formatDate(selectedSegment.start) }}</button>
      </div>

      <ul v-else class="selected-overrides">
        <li v-for="o in selectedActiveOverrides" :key="o.id" class="selected-override-row">
          <span class="window">{{ formatDate(o.effectiveFrom) }} → {{ o.effectiveTo ? formatDate(o.effectiveTo) : '∞' }}</span>
          <span class="target">{{ targetLabel(o.target) }}</span>
          <span class="separator">→</span>
          <span class="change">{{ changeLabel(o.change) }}</span>
          <span v-if="o.presetId" class="source preset-source">
            from preset: {{ presetNameFor(o.presetId) ?? '(deleted)' }}
          </span>
          <span v-else class="source oneoff-source">one-off</span>
          <button class="btn-mini btn-danger" @click="deleteOverride(o.id)" title="Delete this override">×</button>
        </li>
      </ul>

      <div class="selected-actions">
        <button v-if="selectedSegment.activeOverrideIds.length > 0" class="btn-small" @click="openAddOneOff(selectedSegment.start)">
          + Add override starting {{ formatDate(selectedSegment.start) }}
        </button>
        <button v-if="selectedPresetApplicationId" class="btn-small btn-danger" @click="revertSelectedApplication">
          Revert this preset application
        </button>
      </div>
    </div>

    <OneOffOverrideModal :is-open="oneOffModalOpen" :initial-from="oneOffInitialFrom" @close="oneOffModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import OneOffOverrideModal from './OneOffOverrideModal.vue'
import { buildSegments, buildLegend, type TimelineSegment } from '../composables/useConfigTimelineSegments'
import type { ConfigOverride, OverrideTarget, OverrideAttribute } from '@/types'

const dormitoryStore = useDormitoryStore()

const RANGE_KEY = 'dormAssignments-configTimelineRange'

const rangeStart = ref<string>('')
const rangeEnd = ref<string>('')
const selectedSignature = ref<string | null>(null)
const oneOffModalOpen = ref(false)
const oneOffInitialFrom = ref<string | null>(null)

onMounted(() => {
  hydrateRange()
})

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 7, 0) // last day of month +6
  return {
    start: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  }
}

function hydrateRange() {
  const raw = localStorage.getItem(RANGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.start && parsed.end && parsed.start <= parsed.end) {
        rangeStart.value = parsed.start
        rangeEnd.value = parsed.end
        return
      }
    } catch {
      // fall through to default
    }
  }
  const def = defaultRange()
  rangeStart.value = def.start
  rangeEnd.value = def.end
}

watch([rangeStart, rangeEnd], ([s, e]) => {
  if (!s || !e || s > e) return
  localStorage.setItem(RANGE_KEY, JSON.stringify({ start: s, end: e }))
})

function onStartChange(e: Event) {
  rangeStart.value = (e.target as HTMLInputElement).value
}
function onEndChange(e: Event) {
  rangeEnd.value = (e.target as HTMLInputElement).value
}
function resetRange() {
  const def = defaultRange()
  rangeStart.value = def.start
  rangeEnd.value = def.end
}

const segments = computed<TimelineSegment[]>(() => {
  if (!rangeStart.value || !rangeEnd.value) return []
  if (rangeStart.value > rangeEnd.value) return []
  return buildSegments({
    overrides: dormitoryStore.overrides,
    presets: dormitoryStore.presets,
    rangeStart: rangeStart.value,
    rangeEnd: rangeEnd.value,
  })
})

const legend = computed(() => buildLegend(segments.value))

function segmentKey(s: TimelineSegment): string {
  return `${s.start}|${s.signature}`
}

const selectedSegment = computed<TimelineSegment | null>(() => {
  if (!selectedSignature.value) return null
  return segments.value.find(s => segmentKey(s) === selectedSignature.value) ?? null
})

const selectedActiveOverrides = computed<ConfigOverride[]>(() => {
  const seg = selectedSegment.value
  if (!seg) return []
  return seg.activeOverrideIds
    .map(id => dormitoryStore.overrides.find(o => o.id === id))
    .filter((o): o is ConfigOverride => o !== undefined)
})

/**
 * If every override in the selected segment came from the same preset
 * application, expose that application's id so the panel can offer a
 * single-click revert. Returns null otherwise (mixed sources → no
 * single "revert" target).
 */
const selectedPresetApplicationId = computed<string | null>(() => {
  const overrides = selectedActiveOverrides.value
  if (overrides.length === 0) return null
  const first = overrides[0].applicationId
  if (!first) return null
  if (overrides.every(o => o.applicationId === first)) return first
  return null
})

function selectSegment(seg: TimelineSegment) {
  const key = segmentKey(seg)
  selectedSignature.value = selectedSignature.value === key ? null : key
}

function deleteOverride(id: string) {
  if (window.confirm('Delete this override?')) dormitoryStore.deleteOverride(id)
}

function revertSelectedApplication() {
  const appId = selectedPresetApplicationId.value
  if (!appId) return
  if (!window.confirm('Revert this preset application? Every override emitted by this application will be deleted.')) return
  dormitoryStore.revertPresetApplication(appId)
  selectedSignature.value = null
}

function openAddOneOff(startDate?: string) {
  oneOffInitialFrom.value = startDate ?? null
  oneOffModalOpen.value = true
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

function presetNameFor(presetId: string): string | null {
  return dormitoryStore.presets.find(p => p.id === presetId)?.name ?? null
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

function formatTick(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${y}`
}

function segmentTooltip(seg: TimelineSegment): string {
  const range = `${formatDate(seg.start)} → ${formatDate(seg.end)}`
  return `${seg.label}${seg.extraOneOffCount > 0 ? ` (+${seg.extraOneOffCount} one-off)` : ''}\n${range}`
}

/**
 * Like `segmentTooltip`, but the leftmost / rightmost segments
 * additionally call out that they extend past the visible range.
 */
function edgeTooltip(seg: TimelineSegment, idx: number): string {
  const base = segmentTooltip(seg)
  if (idx === 0) return `${base}\n← In effect from before ${formatDate(seg.start)}`
  if (idx === segments.value.length - 1) return `${base}\n→ Continues beyond ${formatDate(seg.end)}`
  return base
}

const todayOffset = computed<number | null>(() => {
  const today = todayIso()
  if (today < rangeStart.value || today > rangeEnd.value) return null
  const totalDays = daysBetween(rangeStart.value, addDays(rangeEnd.value, 1))
  if (totalDays <= 0) return null
  const offsetDays = daysBetween(rangeStart.value, today)
  return (offsetDays / totalDays) * 100
})

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / msPerDay)
}
</script>

<style scoped lang="scss">
.timeline-card {
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

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #374151;
  }

  .header-hint {
    font-size: 0.75rem;
    color: #6b7280;
  }
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 16px;

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-size: 0.75rem;
    color: #6b7280;
  }

  input[type="date"] {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.85rem;
  }
}

.warning {
  margin: 0 16px 12px;
  padding: 8px 12px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.85rem;
}

.bar-wrapper {
  padding: 8px 0 0;
}

.bar {
  position: relative;
  display: flex;
  height: 56px;
  border-top: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
  overflow: hidden;
  user-select: none;
}

.segment {
  position: relative;
  border: none;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
  transition: filter 0.12s;

  &:last-child { border-right: none; }
  &:hover { filter: brightness(0.95); }
  &.is-selected { filter: brightness(0.85); outline: 2px solid #4f46e5; outline-offset: -2px; }
}

.edge-marker {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  pointer-events: none;
  flex-shrink: 0;

  &.leading { margin-right: 4px; }
  &.trailing { margin-left: 4px; }
}

.segment-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.extra-badge {
  margin-left: 4px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.12);
  padding: 1px 5px;
  border-radius: 8px;
}

.today-indicator {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: #ef4444;
  pointer-events: none;
  box-shadow: 0 0 0 1px white;
}

.axis {
  display: flex;
  justify-content: space-between;
  padding: 4px 16px 8px;
  font-size: 0.7rem;
  color: #6b7280;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 12px;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #374151;
}

.legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.selected-panel {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .selected-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .selected-range {
    font-size: 0.8rem;
    color: #6b7280;
  }
}

.selected-empty {
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.selected-overrides {
  list-style: none;
  padding: 0;
  margin: 0 0 8px 0;
}

.selected-override-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.85rem;

  &:last-child { border-bottom: none; }

  .window { color: #374151; font-weight: 500; min-width: 180px; }
  .target { color: #1f2937; }
  .separator { color: #9ca3af; }
  .change { color: #4f46e5; font-weight: 500; }
  .source {
    margin-left: auto;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 10px;

    &.preset-source { background: #ede9fe; color: #6d28d9; }
    &.oneoff-source { background: #f3f4f6; color: #6b7280; }
  }
}

.selected-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
