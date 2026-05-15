/**
 * Tests for date-overlap utilities — the foundation of date-aware bed
 * sharing. The View Date filter, drop dialogs, validation warnings, and
 * auto-placement all derive correctness from `staysOverlap` and friends.
 */

import { describe, it, expect } from 'vitest'
import {
  staysOverlap,
  parseLocalDate,
  stayCoversDate,
  formatGuestDate,
} from './useUtils'

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local midnight (no UTC drift)', () => {
    const d = parseLocalDate('2026-05-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4) // May
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('returns Invalid Date for empty input', () => {
    expect(isNaN(parseLocalDate('').getTime())).toBe(true)
  })

  it('falls back to native parsing for non-ISO strings', () => {
    const d = parseLocalDate('May 15, 2026')
    expect(isNaN(d.getTime())).toBe(false)
    expect(d.getFullYear()).toBe(2026)
  })
})

describe('staysOverlap', () => {
  // Half-open: [arrival, departure). Departure-day is bed-available.

  it('returns true for stays that share interior days', () => {
    expect(
      staysOverlap(
        { arrival: '2026-05-10', departure: '2026-05-15' },
        { arrival: '2026-05-12', departure: '2026-05-18' }
      )
    ).toBe(true)
  })

  it('returns false when one stay departs before the other arrives', () => {
    expect(
      staysOverlap(
        { arrival: '2026-05-10', departure: '2026-05-15' },
        { arrival: '2026-05-20', departure: '2026-05-25' }
      )
    ).toBe(false)
  })

  it('treats departure-day equal to arrival-day as NON-overlapping', () => {
    // Half-open intervals: A leaves morning of 5/15, B arrives same day.
    // The bed is free on the 15th, so this is the "back-to-back" pattern
    // that lets two cohorts share a bed across a single night.
    expect(
      staysOverlap(
        { arrival: '2026-05-10', departure: '2026-05-15' },
        { arrival: '2026-05-15', departure: '2026-05-20' }
      )
    ).toBe(false)
  })

  it('returns true when stays are identical', () => {
    expect(
      staysOverlap(
        { arrival: '2026-05-10', departure: '2026-05-15' },
        { arrival: '2026-05-10', departure: '2026-05-15' }
      )
    ).toBe(true)
  })

  it('returns true when one stay fully contains the other', () => {
    expect(
      staysOverlap(
        { arrival: '2026-05-01', departure: '2026-05-30' },
        { arrival: '2026-05-10', departure: '2026-05-15' }
      )
    ).toBe(true)
  })

  it('treats missing arrival/departure as "always present" (conflicts with everything)', () => {
    expect(
      staysOverlap(
        { arrival: '2026-05-10', departure: '2026-05-15' },
        { arrival: undefined, departure: undefined }
      )
    ).toBe(true)
    expect(
      staysOverlap(
        { arrival: '2026-05-10' }, // missing departure
        { arrival: '2026-12-01', departure: '2026-12-05' }
      )
    ).toBe(true)
  })

  it('treats unparseable dates as conflicting (fail-safe)', () => {
    expect(
      staysOverlap(
        { arrival: 'tomorrow', departure: 'next week' },
        { arrival: '2026-05-10', departure: '2026-05-15' }
      )
    ).toBe(true)
  })

  it('handles Date instances as well as ISO strings', () => {
    const a = { arrival: new Date(2026, 4, 10), departure: new Date(2026, 4, 15) }
    const b = { arrival: '2026-05-12', departure: '2026-05-18' }
    expect(staysOverlap(a, b)).toBe(true)
  })
})

describe('stayCoversDate', () => {
  it('returns true when target falls inside the stay (inclusive of arrival)', () => {
    const stay = { arrival: '2026-05-10', departure: '2026-05-15' }
    expect(stayCoversDate(stay, new Date(2026, 4, 10))).toBe(true)
    expect(stayCoversDate(stay, new Date(2026, 4, 12))).toBe(true)
  })

  it('returns false on departure day (exclusive)', () => {
    const stay = { arrival: '2026-05-10', departure: '2026-05-15' }
    expect(stayCoversDate(stay, new Date(2026, 4, 15))).toBe(false)
  })

  it('returns false outside the stay window', () => {
    const stay = { arrival: '2026-05-10', departure: '2026-05-15' }
    expect(stayCoversDate(stay, new Date(2026, 4, 1))).toBe(false)
    expect(stayCoversDate(stay, new Date(2026, 4, 20))).toBe(false)
  })

  it('treats missing dates as covering every date', () => {
    expect(stayCoversDate({}, new Date(2026, 4, 1))).toBe(true)
    expect(stayCoversDate({ arrival: '2026-05-10' }, new Date(2030, 0, 1))).toBe(true)
  })
})

describe('formatGuestDate', () => {
  it('returns canonical "Month DD, YYYY" for ISO input', () => {
    expect(formatGuestDate('2026-05-15')).toBe('May 15, 2026')
    expect(formatGuestDate('2026-12-01')).toBe('December 1, 2026')
  })

  it('passes through already-canonical format unchanged', () => {
    expect(formatGuestDate('May 15, 2026')).toBe('May 15, 2026')
    expect(formatGuestDate('May 5, 2026')).toBe('May 5, 2026')
  })

  it('handles Planyo-style "30-May-25" / "30-May-2025"', () => {
    expect(formatGuestDate('30-May-25')).toBe('May 30, 2025')
    expect(formatGuestDate('30-May-2025')).toBe('May 30, 2025')
  })

  it('returns empty string for empty input', () => {
    expect(formatGuestDate('')).toBe('')
    expect(formatGuestDate(null)).toBe('')
    expect(formatGuestDate(undefined)).toBe('')
  })

  it('returns input unchanged when it cannot be parsed', () => {
    expect(formatGuestDate('not a date')).toBe('not a date')
  })
})
