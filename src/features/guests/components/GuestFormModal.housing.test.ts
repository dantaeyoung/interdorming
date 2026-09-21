import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { createPinia } from 'pinia'
import GuestFormModal from './GuestFormModal.vue'
import type { Guest } from '@/types'

async function openForm(guest: Guest) {
  const submitted: Partial<Guest>[] = []
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    data: () => ({ show: false }),
    render() {
      return h(GuestFormModal, {
        show: this.show,
        guest,
        onSubmit: (g: Partial<Guest>) => submitted.push(g),
      })
    },
  })
  app.use(createPinia())
  const vm = app.mount(host) as unknown as { show: boolean }
  vm.show = true
  await nextTick()
  await nextTick()
  const select = () => document.querySelector('#housingType') as HTMLSelectElement
  const submit = async () => {
    ;(document.querySelector('form.guest-form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true })
    )
    await nextTick()
  }
  return { submitted, select, submit }
}

const camper = {
  id: 'g1',
  firstName: 'Maria',
  lastName: 'Lopez',
  gender: 'F',
  age: 34,
  housingType: 'Camping',
  csvHousingType: 'Camping',
} as Guest

describe('GuestFormModal staff-set Housing', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('flags the guest when Housing is changed by hand', async () => {
    const { submitted, select, submit } = await openForm({ ...camper })
    select().value = 'Dorm'
    select().dispatchEvent(new Event('change'))
    await submit()
    expect(submitted[0].housingType).toBe('Dorm')
    expect(submitted[0].housingSetByStaff).toBe(true)
  })

  it('does not flag when the form is saved without changing Housing', async () => {
    const { submitted, submit } = await openForm({ ...camper })
    await submit()
    expect(submitted).toHaveLength(1)
    expect('housingSetByStaff' in submitted[0]).toBe(false)
  })

  it('shows the note and "Use CSV value" clears the flag', async () => {
    const { submitted, select, submit } = await openForm({
      ...camper,
      housingType: 'Dorm',
      housingSetByStaff: true,
    })
    const note = document.querySelector('.staff-housing-note')
    expect(note?.textContent).toContain('CSV says: Camping')
    ;(note!.querySelector('button') as HTMLButtonElement).click()
    await nextTick()
    expect(select().value).toBe('Camping')
    await submit()
    expect(submitted[0].housingType).toBe('Camping')
    expect(submitted[0].housingSetByStaff).toBe(false)
  })
})
