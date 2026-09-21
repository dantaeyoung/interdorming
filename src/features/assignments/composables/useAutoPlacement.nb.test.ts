/**
 * Non-binary guests and NB rooms in auto-placement.
 *
 * `'NB'` was added as a RoomGender (PR #48) but never wired into
 * `scoreGenderMatch`, which handled only Coed / M+M / F+F and returned
 * -1 for everything else. Since -1 becomes -Infinity in
 * `scoreRoomForGroup`, an NB room rejected EVERY guest — auto-place on
 * one silently produced nothing — and a non-binary guest, matching no
 * case, could only ever land in a Coed room.
 *
 * These tests pin the intended behavior: NB rooms are the mirror of M
 * and F rooms (non-binary guests only), and non-binary guests strongly
 * prefer an NB room while still falling back to Coed.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAutoPlacement } from './useAutoPlacement'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { Guest, GuestInput, RoomGender } from '@/types'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    key: () => null,
    length: 0,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

if (typeof globalThis.crypto === 'undefined') {
  ;(globalThis as { crypto: Crypto }).crypto = {
    randomUUID: () => Math.random().toString(36).slice(2) as `${string}-${string}-${string}-${string}-${string}`,
  } as Crypto
} else if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = () =>
    Math.random().toString(36).slice(2) as `${string}-${string}-${string}-${string}-${string}`
}

/** One room per entry, one bed each, so bed id reveals which room won. */
function seedRooms(rooms: Array<{ name: string; gender: RoomGender; bedId: string }>) {
  useDormitoryStore().importDormitories([
    {
      dormitoryName: 'Test Dorm',
      active: true,
      rooms: rooms.map(r => ({
        roomName: r.name,
        roomGender: r.gender,
        active: true,
        beds: [{ bedId: r.bedId, bedType: 'single' as const, position: 1, assignments: [] }],
      })),
    },
  ])
}

function addGuest(firstName: string, extras: Partial<GuestInput> = {}): Guest {
  return useGuestStore().addGuest({
    firstName,
    lastName: 'Test',
    gender: 'M',
    age: 30,
    arrival: '2026-03-10',
    departure: '2026-03-15',
    indivGrp: 'individual',
    ...extras,
  })
}

describe('useAutoPlacement — NB rooms and non-binary guests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('places a non-binary guest into an NB room', () => {
    seedRooms([{ name: 'NB Room', gender: 'NB', bedId: 'NB01' }])
    const nb = addGuest('Robin', { gender: 'Non-binary/Other' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(nb.id)).toBe('NB01')
  })

  it('prefers an NB room over a Coed room for a non-binary guest', () => {
    seedRooms([
      { name: 'Coed Room', gender: 'Coed', bedId: 'CO01' },
      { name: 'NB Room', gender: 'NB', bedId: 'NB01' },
    ])
    const nb = addGuest('Robin', { gender: 'Non-binary/Other' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(nb.id)).toBe('NB01')
  })

  it('falls back to Coed when no NB room has space', () => {
    seedRooms([{ name: 'Coed Room', gender: 'Coed', bedId: 'CO01' }])
    const nb = addGuest('Robin', { gender: 'Non-binary/Other' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(nb.id)).toBe('CO01')
  })

  it('never puts a non-binary guest in an M or F room', () => {
    seedRooms([
      { name: 'Male Room', gender: 'M', bedId: 'M01' },
      { name: 'Female Room', gender: 'F', bedId: 'F01' },
    ])
    const nb = addGuest('Robin', { gender: 'Non-binary/Other' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(nb.id)).toBeUndefined()
  })

  it('keeps M and F guests out of an NB room', () => {
    seedRooms([{ name: 'NB Room', gender: 'NB', bedId: 'NB01' }])
    const m = addGuest('Sam', { gender: 'M' })
    const f = addGuest('Alex', { gender: 'F' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(m.id)).toBeUndefined()
    expect(result.suggestions.get(f.id)).toBeUndefined()
  })

  it('room-level auto-place works on an NB room (was silently empty)', () => {
    seedRooms([{ name: 'NB Room', gender: 'NB', bedId: 'NB01' }])
    const nb = addGuest('Robin', { gender: 'Non-binary/Other' })

    const room = useDormitoryStore().dormitories[0].rooms[0]
    const suggestions = useAutoPlacement().autoPlaceGuestsInRoom(room)
    expect(suggestions.get(nb.id)).toBe('NB01')
  })

  it('still places M and F guests in their own rooms', () => {
    seedRooms([
      { name: 'Male Room', gender: 'M', bedId: 'M01' },
      { name: 'Female Room', gender: 'F', bedId: 'F01' },
    ])
    const m = addGuest('Sam', { gender: 'M' })
    const f = addGuest('Alex', { gender: 'F' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(m.id)).toBe('M01')
    expect(result.suggestions.get(f.id)).toBe('F01')
  })

  it('places an all-non-binary group together in an NB room', () => {
    useDormitoryStore().importDormitories([
      {
        dormitoryName: 'Test Dorm',
        active: true,
        rooms: [
          {
            roomName: 'Coed Room', roomGender: 'Coed', active: true,
            beds: [
              { bedId: 'CO01', bedType: 'single', position: 1, assignments: [] },
              { bedId: 'CO02', bedType: 'single', position: 2, assignments: [] },
            ],
          },
          {
            roomName: 'NB Room', roomGender: 'NB', active: true,
            beds: [
              { bedId: 'NB01', bedType: 'single', position: 1, assignments: [] },
              { bedId: 'NB02', bedType: 'single', position: 2, assignments: [] },
            ],
          },
        ],
      },
    ])
    const a = addGuest('Robin', { gender: 'Non-binary/Other', groupName: 'Friends', indivGrp: 'group' })
    const b = addGuest('Jo', { gender: 'Non-binary/Other', groupName: 'Friends', indivGrp: 'group' })

    const result = useAutoPlacement().autoPlaceGuests()
    expect(result.suggestions.get(a.id)).toMatch(/^NB0/)
    expect(result.suggestions.get(b.id)).toMatch(/^NB0/)
  })
})
