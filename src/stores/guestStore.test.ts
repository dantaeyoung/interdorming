/**
 * Tests for the defensive Map-shape watcher in guestStore that fixes
 * #28 — hovering a group name in All Reservations could crash if
 * suggestedGroups landed as a plain object (stale localStorage from an
 * older build, HMR weirdness, dev-tools edits). The watcher normalizes
 * any non-Map write back into a Map<string, Set<string>> synchronously
 * so consumers can keep calling .entries() / .size / .get() naively.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGuestStore } from './guestStore'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: () => null,
    length: 0,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('guestStore.suggestedGroups normalization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('keeps a real Map as a Map (no spurious re-wrap)', () => {
    const store = useGuestStore()
    const map = new Map([['Smith Family', new Set(['g1', 'g2'])]])
    store.suggestedGroups = map
    // Pinia wraps the value in a reactive proxy, so identity (`toBe`)
    // won't match — but it must still BE a Map and preserve members.
    expect(store.suggestedGroups instanceof Map).toBe(true)
    expect(store.suggestedGroups.size).toBe(1)
    expect(Array.from(store.suggestedGroups.get('Smith Family') ?? [])).toEqual(['g1', 'g2'])
  })

  it('converts a plain object with array values back into a Map<string, Set>', () => {
    const store = useGuestStore()
    // Simulate stale localStorage from an older build that persisted
    // suggestedGroups as `{ groupName: ['guest1', 'guest2'] }`.
    store.suggestedGroups = { 'Smith Family': ['g1', 'g2'] } as unknown as Map<string, Set<string>>

    expect(store.suggestedGroups instanceof Map).toBe(true)
    expect(store.suggestedGroups.size).toBe(1)
    const members = store.suggestedGroups.get('Smith Family')
    expect(members instanceof Set).toBe(true)
    expect(Array.from(members ?? [])).toEqual(['g1', 'g2'])
  })

  it('converts a plain object with broken {} values into empty Sets (lossy but does not crash)', () => {
    // Sets serialize through JSON as {} — round-trip persistence loses
    // the members. We can't recover them, but we MUST not crash.
    const store = useGuestStore()
    store.suggestedGroups = { 'Smith Family': {} } as unknown as Map<string, Set<string>>

    expect(store.suggestedGroups instanceof Map).toBe(true)
    const members = store.suggestedGroups.get('Smith Family')
    expect(members instanceof Set).toBe(true)
    expect(members?.size).toBe(0)
  })

  it('lets consumers call .entries() without throwing after a non-Map write', () => {
    // This is the exact failure mode in issue #28.
    const store = useGuestStore()
    store.suggestedGroups = { 'A': ['g1'], 'B': ['g2'] } as unknown as Map<string, Set<string>>

    expect(() => {
      const out: string[] = []
      for (const [name] of store.suggestedGroups.entries()) out.push(name)
      return out
    }).not.toThrow()

    // hasGroupSuggestions / groupSuggestionCount also rely on .size
    expect(store.hasGroupSuggestions).toBe(true)
    expect(store.groupSuggestionCount).toBe(2)
  })
})
