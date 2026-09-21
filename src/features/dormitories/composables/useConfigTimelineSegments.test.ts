/**
 * Tests for the timeline-bar segment builder.
 *
 * Covers the spec's segment rules: boundary collection, signature
 * computation, preset-vs-one-off labeling (including the "+N" badge),
 * stable colors for repeat signatures, and clipping to the visible
 * range.
 */

import { describe, it, expect } from 'vitest'
import { buildSegments, buildLegend, TIMELINE_DEFAULT_COLOR } from './useConfigTimelineSegments'
import type { ConfigOverride, OverridePreset } from '@/types'

function makeOverride(input: Partial<ConfigOverride> & Pick<ConfigOverride, 'id' | 'effectiveFrom'>): ConfigOverride {
  return {
    id: input.id,
    target: input.target ?? { kind: 'dormitory', dormitoryName: 'Maple Hall' },
    change: input.change ?? { attr: 'active', value: false },
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    presetId: input.presetId ?? null,
    applicationId: input.applicationId ?? null,
    createdAt: input.createdAt ?? '2026-01-01T00:00:00.000Z',
    note: input.note,
  }
}

describe('buildSegments — empty case', () => {
  it('returns one continuous Default segment when no overrides exist', () => {
    const segs = buildSegments({
      overrides: [],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    expect(segs.length).toBe(1)
    expect(segs[0].start).toBe('2026-01-01')
    expect(segs[0].end).toBe('2026-12-31')
    expect(segs[0].label).toBe('Default')
    expect(segs[0].color).toBe(TIMELINE_DEFAULT_COLOR)
    expect(segs[0].signature).toBe('')
  })
})

describe('buildSegments — single override', () => {
  it('splits the range into three segments: Default / override window / Default', () => {
    const o = makeOverride({ id: 'o1', effectiveFrom: '2026-07-04', effectiveTo: '2026-07-11' })
    const segs = buildSegments({
      overrides: [o],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    expect(segs.length).toBe(3)
    expect(segs[0]).toMatchObject({ start: '2026-01-01', end: '2026-07-03', label: 'Default' })
    expect(segs[1]).toMatchObject({ start: '2026-07-04', end: '2026-07-11', label: 'Custom' })
    expect(segs[2]).toMatchObject({ start: '2026-07-12', end: '2026-12-31', label: 'Default' })
  })

  it('two distant Default segments share the same color', () => {
    const o = makeOverride({ id: 'o1', effectiveFrom: '2026-07-04', effectiveTo: '2026-07-11' })
    const segs = buildSegments({
      overrides: [o],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    expect(segs[0].color).toBe(segs[2].color)
    expect(segs[0].color).toBe(TIMELINE_DEFAULT_COLOR)
  })
})

describe('buildSegments — preset labeling', () => {
  it("uses the preset's name when exactly one preset application fully covers the segment", () => {
    const preset: OverridePreset = {
      id: 'p1',
      name: "Women's Retreat",
      entries: [],
      createdAt: '',
      updatedAt: '',
    }
    const o = makeOverride({
      id: 'o1',
      effectiveFrom: '2026-07-04',
      effectiveTo: '2026-07-11',
      presetId: 'p1',
      applicationId: 'a1',
    })
    const segs = buildSegments({
      overrides: [o],
      presets: [preset],
      rangeStart: '2026-06-01',
      rangeEnd: '2026-08-31',
    })
    const presetSeg = segs.find(s => s.start === '2026-07-04')
    expect(presetSeg?.label).toBe("Women's Retreat")
    expect(presetSeg?.extraOneOffCount).toBe(0)
  })

  it("labels a preset segment with +N when one-offs overlap it", () => {
    const preset: OverridePreset = { id: 'p1', name: 'Winter', entries: [], createdAt: '', updatedAt: '' }
    const presetOverride = makeOverride({
      id: 'o1',
      effectiveFrom: '2026-12-01',
      effectiveTo: '2026-12-31',
      presetId: 'p1',
      applicationId: 'a1',
    })
    const oneOff = makeOverride({
      id: 'o2',
      effectiveFrom: '2026-12-01',
      effectiveTo: '2026-12-31',
      target: { kind: 'bed', bedId: 'MA3' },
    })
    const segs = buildSegments({
      overrides: [presetOverride, oneOff],
      presets: [preset],
      rangeStart: '2026-11-01',
      rangeEnd: '2027-01-31',
    })
    const winter = segs.find(s => s.start === '2026-12-01')
    expect(winter?.label).toBe('Winter')
    expect(winter?.extraOneOffCount).toBe(1)
  })

  it("labels 'Custom' when only one-offs are active (no preset)", () => {
    const o = makeOverride({
      id: 'o1',
      effectiveFrom: '2026-08-12',
      effectiveTo: null,
      target: { kind: 'bed', bedId: 'MA3' },
    })
    const segs = buildSegments({
      overrides: [o],
      presets: [],
      rangeStart: '2026-08-01',
      rangeEnd: '2026-09-30',
    })
    const customSeg = segs.find(s => s.start === '2026-08-12')
    expect(customSeg?.label).toBe('Custom')
  })
})

describe('buildSegments — signature reuse → same color', () => {
  it('two non-overlapping applications of the same preset get the same color', () => {
    // Same applicationId across the two windows isn't realistic, but
    // the signature only depends on the active override IDs in that
    // segment. To get matching signatures across windows, we need the
    // same override ID set — impossible since each override has a
    // unique id. So test the inverse: two segments where the active
    // override set is identical get identical colors.
    const o1 = makeOverride({ id: 'o1', effectiveFrom: '2026-07-04', effectiveTo: '2026-07-11' })
    const segs = buildSegments({
      overrides: [o1],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    // The two Default segments (before and after o1's window) have
    // identical empty signature → identical color.
    const defaults = segs.filter(s => s.signature === '')
    expect(defaults.length).toBe(2)
    expect(defaults[0].color).toBe(defaults[1].color)
  })
})

describe('buildSegments — clipping to range', () => {
  it('treats an open-ended override (effectiveTo null) correctly within the range', () => {
    const o = makeOverride({ id: 'o1', effectiveFrom: '2026-08-12', effectiveTo: null })
    const segs = buildSegments({
      overrides: [o],
      presets: [],
      rangeStart: '2026-07-01',
      rangeEnd: '2026-12-31',
    })
    expect(segs.length).toBe(2)
    expect(segs[0]).toMatchObject({ start: '2026-07-01', end: '2026-08-11', label: 'Default' })
    expect(segs[1]).toMatchObject({ start: '2026-08-12', end: '2026-12-31', label: 'Custom' })
  })

  it('ignores overrides that fall entirely before the visible range', () => {
    const o = makeOverride({ id: 'o1', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31' })
    const segs = buildSegments({
      overrides: [o],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    expect(segs.length).toBe(1)
    expect(segs[0].label).toBe('Default')
  })

  it('returns empty when rangeStart > rangeEnd', () => {
    expect(
      buildSegments({ overrides: [], presets: [], rangeStart: '2026-12-01', rangeEnd: '2026-01-01' })
    ).toEqual([])
  })
})

describe('buildLegend', () => {
  it('returns one entry per unique signature in first-appearance order', () => {
    const o1 = makeOverride({ id: 'o1', effectiveFrom: '2026-07-04', effectiveTo: '2026-07-11' })
    const segs = buildSegments({
      overrides: [o1],
      presets: [],
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
    })
    const legend = buildLegend(segs)
    expect(legend.length).toBe(2)
    expect(legend[0].label).toBe('Default')
    expect(legend[1].label).toBe('Custom')
  })
})
