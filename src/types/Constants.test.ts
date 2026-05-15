/**
 * Tests for the typed CSV-coercion helpers used by both
 * parseRoomConfigCSV implementations (App.vue and RoomConfigCSV.vue).
 * These replaced `(values[...] || 'M') as any` casts that previously
 * let any raw string flow into RoomGender / BedType — see PR #31.
 */

import { describe, it, expect } from 'vitest'
import { parseRoomGender, parseBedType } from './Constants'

describe('parseRoomGender', () => {
  it('accepts the canonical values exactly as written', () => {
    expect(parseRoomGender('M')).toBe('M')
    expect(parseRoomGender('F')).toBe('F')
    expect(parseRoomGender('Coed')).toBe('Coed')
  })

  it('is case-insensitive', () => {
    expect(parseRoomGender('m')).toBe('M')
    expect(parseRoomGender('f')).toBe('F')
    expect(parseRoomGender('coed')).toBe('Coed')
    expect(parseRoomGender('COED')).toBe('Coed')
  })

  it('accepts common operator aliases', () => {
    expect(parseRoomGender('Male')).toBe('M')
    expect(parseRoomGender('male')).toBe('M')
    expect(parseRoomGender('FEMALE')).toBe('F')
    expect(parseRoomGender('Mixed')).toBe('Coed')
    expect(parseRoomGender('co-ed')).toBe('Coed')
  })

  it('trims whitespace before matching', () => {
    expect(parseRoomGender('  M  ')).toBe('M')
    expect(parseRoomGender('\tCoed\n')).toBe('Coed')
  })

  it('falls back to M for missing or unknown values', () => {
    expect(parseRoomGender(undefined)).toBe('M')
    expect(parseRoomGender(null)).toBe('M')
    expect(parseRoomGender('')).toBe('M')
    expect(parseRoomGender('   ')).toBe('M')
    expect(parseRoomGender('xyz')).toBe('M')
  })
})

describe('parseBedType', () => {
  it('accepts the canonical lowercase values', () => {
    expect(parseBedType('upper')).toBe('upper')
    expect(parseBedType('lower')).toBe('lower')
    expect(parseBedType('single')).toBe('single')
  })

  it('is case-insensitive', () => {
    expect(parseBedType('UPPER')).toBe('upper')
    expect(parseBedType('Lower')).toBe('lower')
    expect(parseBedType('Single')).toBe('single')
  })

  it('trims whitespace before matching', () => {
    expect(parseBedType('  upper  ')).toBe('upper')
    expect(parseBedType('\tsingle\n')).toBe('single')
  })

  it('falls back to single for missing or unknown values', () => {
    expect(parseBedType(undefined)).toBe('single')
    expect(parseBedType(null)).toBe('single')
    expect(parseBedType('')).toBe('single')
    expect(parseBedType('top')).toBe('single')
    expect(parseBedType('bunk')).toBe('single')
  })
})
