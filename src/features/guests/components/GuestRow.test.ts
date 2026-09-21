import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import GuestRow from './GuestRow.vue'
import { useGuestStore } from '@/stores/guestStore'
import { DEFAULT_GUEST_DATA_COLUMNS } from '@/types/Settings'
import type { Guest } from '@/types'

function mountRow(guest: Guest) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useGuestStore()
  store.guests = [guest]
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () =>
      h('table', [h('tbody', [h(GuestRow, { guest: store.guests[0], columns: DEFAULT_GUEST_DATA_COLUMNS })])]),
  })
  app.use(pinia)
  app.mount(host)
  return { store, row: () => host.querySelector('tr.guest-row') as HTMLTableRowElement }
}

describe('GuestRow draggability', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('becomes draggable when Housing changes from Camping to Dorm, without remounting', async () => {
    const { store, row } = mountRow({
      id: 'g1',
      firstName: 'Maria',
      lastName: 'Lopez',
      gender: 'F',
      age: 34,
      housingType: 'Camping',
    } as Guest)

    expect(row().getAttribute('draggable')).toBeNull()

    store.guests[0].housingType = 'Dorm'
    await nextTick()

    expect(row().getAttribute('draggable')).toBe('true')
  })

  it('stops being draggable when Housing changes from Dorm to Camping', async () => {
    const { store, row } = mountRow({
      id: 'g2',
      firstName: 'Tom',
      lastName: 'Ng',
      gender: 'M',
      age: 41,
      housingType: 'Dorm',
    } as Guest)

    expect(row().getAttribute('draggable')).toBe('true')

    store.guests[0].housingType = 'Camping'
    await nextTick()

    expect(row().getAttribute('draggable')).toBeNull()
  })
})
