/**
 * Pure segment computation for the configuration timeline bar.
 *
 * Given the full list of overrides + presets and a visible date range,
 * splits the range into segments at every override boundary and
 * assigns each segment a stable color from its "configuration
 * signature" (the sorted set of active override IDs).
 *
 * Pure functions — no Pinia / Vue dependencies — so they can be unit
 * tested directly and called from any component.
 *
 * See `specs/TimelineConfigView.md` for the design.
 */

import type { ConfigOverride, OverridePreset } from '@/types'

export interface TimelineSegment {
  /** Inclusive ISO YYYY-MM-DD start of this segment. */
  start: string
  /** Inclusive ISO YYYY-MM-DD end of this segment. */
  end: string
  /** Override IDs active throughout this segment, sorted ascending. */
  activeOverrideIds: string[]
  /** Stable signature key used for color reuse and equality checks. */
  signature: string
  /** Display label per the spec's naming rules. */
  label: string
  /**
   * When the segment is labelled with a preset's name, this counts any
   * **non-preset** overrides also active in the segment so the bar can
   * render a "+N" badge ("Women's Retreat +1").
   */
  extraOneOffCount: number
  /** Hex color for the segment background. */
  color: string
  /** Day count, used as flex-grow weight when rendering. */
  durationDays: number
}

/**
 * Default segment ('no overrides active') is pinned to a neutral grey so
 * the eye lands on retreats/overrides rather than the baseline.
 */
const DEFAULT_COLOR = '#e5e7eb'

/**
 * Light, distinct pastels. Picked for readable text contrast on white
 * and enough perceptual distance that two adjacent segments don't
 * blend together. Index 0 is reserved for `Default`; non-default
 * signatures hash into 1..N.
 */
const PALETTE = [
  DEFAULT_COLOR,
  '#ddd6fe', // violet
  '#fde68a', // amber
  '#bbf7d0', // green
  '#fbcfe8', // pink
  '#bae6fd', // sky
  '#fed7aa', // orange
  '#c7d2fe', // indigo
  '#fef08a', // yellow
  '#a7f3d0', // emerald
]

/**
 * djb2 — stable, deterministic hash. We just need an integer for palette
 * indexing; cryptographic strength isn't relevant.
 */
function hashSignature(signature: string): number {
  let h = 5381
  for (let i = 0; i < signature.length; i++) {
    h = ((h << 5) + h + signature.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  const diff = parseIso(b).getTime() - parseIso(a).getTime()
  return Math.round(diff / msPerDay)
}

/**
 * True if the override's window contains `date` (inclusive on both ends,
 * `effectiveTo === null` means open-ended).
 */
function overrideActiveOn(o: ConfigOverride, date: string): boolean {
  if (date < o.effectiveFrom) return false
  if (o.effectiveTo === null) return true
  return date <= o.effectiveTo
}

/**
 * True if every override emitted by a specific preset application is
 * active throughout the segment — i.e. the preset's emit-set is a
 * subset of `activeOverrideIds` AND every emitted override's
 * application id is the same. Used by segment labeling.
 */
function applicationFullyCovers(
  applicationId: string,
  activeOverrideIds: string[],
  allOverrides: ConfigOverride[]
): boolean {
  const emitted = allOverrides.filter(o => o.applicationId === applicationId)
  if (emitted.length === 0) return false
  const active = new Set(activeOverrideIds)
  return emitted.every(o => active.has(o.id))
}

interface BuildSegmentsInput {
  overrides: ConfigOverride[]
  presets: OverridePreset[]
  rangeStart: string
  rangeEnd: string
}

export function buildSegments({
  overrides,
  presets,
  rangeStart,
  rangeEnd,
}: BuildSegmentsInput): TimelineSegment[] {
  if (rangeStart > rangeEnd) return []

  // Boundaries: every date where the set of active overrides changes.
  // Effective-from contributes that date; effective-to contributes
  // (effective-to + 1) because the override is still active ON
  // effective-to (inclusive) and stops being active the next day.
  const boundarySet = new Set<string>([rangeStart, addDays(rangeEnd, 1)])
  for (const o of overrides) {
    if (o.effectiveFrom >= rangeStart && o.effectiveFrom <= addDays(rangeEnd, 1)) {
      boundarySet.add(clamp(o.effectiveFrom, rangeStart, addDays(rangeEnd, 1)))
    }
    if (o.effectiveTo !== null) {
      const afterTo = addDays(o.effectiveTo, 1)
      if (afterTo >= rangeStart && afterTo <= addDays(rangeEnd, 1)) {
        boundarySet.add(clamp(afterTo, rangeStart, addDays(rangeEnd, 1)))
      }
    }
  }

  const boundaries = [...boundarySet].sort()

  const segments: TimelineSegment[] = []
  const sortedPresetApplicationIds = new Map<string, string>() // applicationId → presetId

  for (const o of overrides) {
    if (o.applicationId && o.presetId) {
      sortedPresetApplicationIds.set(o.applicationId, o.presetId)
    }
  }

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i]
    const segEndExclusive = boundaries[i + 1]
    if (segStart >= segEndExclusive) continue
    const segEnd = addDays(segEndExclusive, -1)

    // Pick the segment's "interior" date for activity check. By
    // construction every date in [segStart, segEnd] has the same
    // override set, so any one works.
    const probe = segStart
    const active = overrides.filter(o => overrideActiveOn(o, probe))
    const activeOverrideIds = active.map(o => o.id).sort()
    const signature = activeOverrideIds.join(',')

    // Labeling
    const presetApplicationsInSegment = new Map<string, string>() // applicationId → presetId
    let oneOffCount = 0
    for (const o of active) {
      if (o.applicationId && o.presetId) {
        presetApplicationsInSegment.set(o.applicationId, o.presetId)
      } else {
        oneOffCount++
      }
    }

    let label = 'Default'
    let extraOneOffCount = 0
    const fullyCoveringPresetIds: string[] = []
    for (const [applicationId, presetId] of presetApplicationsInSegment) {
      if (applicationFullyCovers(applicationId, activeOverrideIds, overrides)) {
        fullyCoveringPresetIds.push(presetId)
      }
    }

    if (active.length === 0) {
      label = 'Default'
    } else if (fullyCoveringPresetIds.length === 1 && presetApplicationsInSegment.size === 1) {
      // Exactly one preset fully covering, no other preset entries; any
      // one-off overrides become "+N" on the preset's label.
      const preset = presets.find(p => p.id === fullyCoveringPresetIds[0])
      label = preset?.name ?? 'Preset (deleted)'
      extraOneOffCount = oneOffCount
    } else if (fullyCoveringPresetIds.length === 0 && oneOffCount === active.length) {
      label = 'Custom'
    } else {
      // Mix of partial preset coverage or multiple presets.
      label = 'Custom'
    }

    // Color: Default fixed; non-default signatures hash into 1..N.
    let color: string
    if (signature === '') {
      color = PALETTE[0]
    } else {
      const idx = (hashSignature(signature) % (PALETTE.length - 1)) + 1
      color = PALETTE[idx]
    }

    segments.push({
      start: segStart,
      end: segEnd,
      activeOverrideIds,
      signature,
      label,
      extraOneOffCount,
      color,
      durationDays: daysBetween(segStart, segEndExclusive),
    })
  }

  return segments
}

function clamp(value: string, lo: string, hi: string): string {
  if (value < lo) return lo
  if (value > hi) return hi
  return value
}

/**
 * Build a legend: one entry per unique signature visible in the segments,
 * preserving first-appearance order. Used by the bar's legend chip row.
 */
export function buildLegend(segments: TimelineSegment[]): Array<{ signature: string; label: string; color: string }> {
  const seen = new Set<string>()
  const out: Array<{ signature: string; label: string; color: string }> = []
  for (const s of segments) {
    if (seen.has(s.signature)) continue
    seen.add(s.signature)
    out.push({ signature: s.signature, label: s.label, color: s.color })
  }
  return out
}

/**
 * Exported for tests — lets us verify the palette pin without
 * exporting all the internals.
 */
export const TIMELINE_DEFAULT_COLOR = DEFAULT_COLOR
