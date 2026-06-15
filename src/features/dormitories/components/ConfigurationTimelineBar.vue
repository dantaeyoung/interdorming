<template>
  <div class="timeline-card">
    <div class="card-header">
      <div class="header-left">
        <h4>Configuration timeline</h4>
        <span class="header-hint">Click a configuration to edit it. Add a cut to split the timeline.</span>
      </div>
      <button class="btn-small" @click="openCut()">+ Cut here…</button>
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
          :key="seg.id"
          :style="{ flexGrow: seg.durationDays, background: seg.color }"
          :class="['segment', { 'is-selected': selectedConfigurationId === seg.id }]"
          role="listitem"
          :title="segmentTooltip(seg, idx)"
          @click="selectSegment(seg.id)"
        >
          <span v-if="idx === 0" class="edge-marker leading" aria-hidden="true">←</span>
          <span class="segment-label">{{ seg.name }}</span>
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
      <div v-for="item in legend" :key="item.id" class="legend-chip">
        <span class="legend-swatch" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.name }}</span>
      </div>
    </div>

    <CutPopover :is-open="cutPopoverOpen" :initial-date="cutInitialDate" @close="cutPopoverOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import CutPopover from './CutPopover.vue'
import type { TimelineConfiguration } from '@/types'

const dormitoryStore = useDormitoryStore()

const RANGE_KEY = 'dormAssignments-configTimelineRange'

const rangeStart = ref('')
const rangeEnd = ref('')
const cutPopoverOpen = ref(false)
const cutInitialDate = ref<string | null>(null)

const selectedConfigurationId = computed(() => dormitoryStore.selectedConfigurationId)
const configurations = computed(() => dormitoryStore.configurations)

onMounted(() => hydrateRange())

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 7, 0)
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
      // fall through
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

function onStartChange(e: Event) { rangeStart.value = (e.target as HTMLInputElement).value }
function onEndChange(e: Event) { rangeEnd.value = (e.target as HTMLInputElement).value }
function resetRange() {
  const def = defaultRange()
  rangeStart.value = def.start
  rangeEnd.value = def.end
}

interface DisplaySegment {
  id: string
  name: string
  start: string
  end: string
  durationDays: number
  color: string
}

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
  const ms = 86400000
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / ms)
}

const PALETTE = [
  '#e5e7eb', // grey — default-y, used for the initial config
  '#ddd6fe', '#fde68a', '#bbf7d0', '#fbcfe8', '#bae6fd', '#fed7aa', '#c7d2fe', '#fef08a', '#a7f3d0',
]
function hashId(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0
  return Math.abs(h)
}
function colorFor(config: TimelineConfiguration): string {
  if (config.effectiveFrom === null) return PALETTE[0]
  return PALETTE[(hashId(config.id) % (PALETTE.length - 1)) + 1]
}

const segments = computed<DisplaySegment[]>(() => {
  if (!rangeStart.value || !rangeEnd.value || rangeStart.value > rangeEnd.value) return []
  const cfgs = [...configurations.value].sort((a, b) => {
    if (a.effectiveFrom === b.effectiveFrom) return 0
    if (a.effectiveFrom === null) return -1
    if (b.effectiveFrom === null) return 1
    return a.effectiveFrom < b.effectiveFrom ? -1 : 1
  })
  if (cfgs.length === 0) return []

  const out: DisplaySegment[] = []
  const rangeEndExclusive = addDays(rangeEnd.value, 1)

  for (let i = 0; i < cfgs.length; i++) {
    const c = cfgs[i]
    const next = cfgs[i + 1]
    const effStart = c.effectiveFrom ?? rangeStart.value
    const effEndExclusive = next?.effectiveFrom ?? rangeEndExclusive

    // Clip to visible range
    const segStart = effStart < rangeStart.value ? rangeStart.value : effStart
    const segEndExclusive = effEndExclusive > rangeEndExclusive ? rangeEndExclusive : effEndExclusive
    if (segStart >= segEndExclusive) continue

    out.push({
      id: c.id,
      name: c.name,
      start: segStart,
      end: addDays(segEndExclusive, -1),
      durationDays: Math.max(1, daysBetween(segStart, segEndExclusive)),
      color: colorFor(c),
    })
  }
  return out
})

const legend = computed(() => {
  const seen = new Set<string>()
  const out: Array<{ id: string; name: string; color: string }> = []
  for (const s of segments.value) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    out.push({ id: s.id, name: s.name, color: s.color })
  }
  return out
})

function selectSegment(id: string) {
  dormitoryStore.selectConfiguration(id)
}

function openCut(prefilledDate?: string) {
  cutInitialDate.value = prefilledDate ?? todayIso()
  cutPopoverOpen.value = true
}

function segmentTooltip(seg: DisplaySegment, idx: number): string {
  const range = `${formatDate(seg.start)} → ${formatDate(seg.end)}`
  let base = `${seg.name}\n${range}`
  if (idx === 0) base += `\n← In effect from before ${formatDate(seg.start)}`
  if (idx === segments.value.length - 1) base += `\n→ Continues beyond ${formatDate(seg.end)}`
  return base
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

const todayOffset = computed<number | null>(() => {
  const today = todayIso()
  if (today < rangeStart.value || today > rangeEnd.value) return null
  const total = daysBetween(rangeStart.value, addDays(rangeEnd.value, 1))
  if (total <= 0) return null
  return (daysBetween(rangeStart.value, today) / total) * 100
})
</script>

<style scoped lang="scss">
.timeline-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  h4 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #374151; }
  .header-hint { font-size: 0.75rem; color: #6b7280; }
}
.controls {
  display: flex; align-items: flex-end; gap: 12px; padding: 12px 16px;
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 0.75rem; color: #6b7280; }
  input[type="date"] { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.85rem; }
}
.warning {
  margin: 0 16px 12px; padding: 8px 12px; background: #fee2e2; border: 1px solid #fca5a5;
  border-radius: 6px; color: #991b1b; font-size: 0.85rem;
}
.bar-wrapper { padding: 8px 0 0; }
.bar {
  position: relative; display: flex; height: 56px;
  border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; overflow: hidden; user-select: none;
}
.segment {
  position: relative; border: none; border-right: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 6px; font-size: 0.75rem; font-weight: 500; color: #1f2937;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  min-width: 0; overflow: hidden; transition: filter 0.12s;
  &:last-child { border-right: none; }
  &:hover { filter: brightness(0.95); }
  &.is-selected { filter: brightness(0.85); outline: 2px solid #4f46e5; outline-offset: -2px; }
}
.edge-marker { font-size: 0.75rem; color: rgba(0, 0, 0, 0.4); pointer-events: none; flex-shrink: 0;
  &.leading { margin-right: 4px; } &.trailing { margin-left: 4px; } }
.segment-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
.today-indicator {
  position: absolute; top: -4px; bottom: -4px; width: 2px; background: #ef4444;
  pointer-events: none; box-shadow: 0 0 0 1px white;
}
.axis {
  display: flex; justify-content: space-between; padding: 4px 16px 8px;
  font-size: 0.7rem; color: #6b7280;
}
.legend { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; }
.legend-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #374151; }
.legend-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); }
.btn-small {
  padding: 4px 10px; font-size: 0.8rem; border: 1px solid #d1d5db;
  background: white; border-radius: 4px; cursor: pointer; white-space: nowrap;
  &:hover { background: #f3f4f6; }
}
</style>
