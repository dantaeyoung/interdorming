import { describe, it, expect } from 'vitest'
import { mergeImportedGuest } from './mergeImportedGuest'
import type { Guest } from '@/types'

const base = { firstName: 'Maria', lastName: 'Lopez', gender: 'F', age: 34 } as const

function stored(extra: Partial<Guest>): Guest {
  return { id: 'g1', planyoId: 'P1', ...base, ...extra } as Guest
}
function row(extra: Partial<Guest>): Guest {
  return { id: 'new', planyoId: 'P1', ...base, ...extra } as Guest
}

describe('mergeImportedGuest', () => {
  it('keeps staff-set Housing when the CSV says otherwise, and reports it', () => {
    const { merged, staffHousingKept } = mergeImportedGuest(
      stored({ housingType: 'Dorm', housingSetByStaff: true, csvHousingType: 'Camping' }),
      row({ housingType: 'Camping', csvHousingType: 'Camping', roomRequest: 'CampingWomen' })
    )
    expect(merged.housingType).toBe('Dorm')
    expect(merged.housingSetByStaff).toBe(true)
    expect(merged.csvHousingType).toBe('Camping')
    expect(merged.roomRequest).toBe('CampingWomen')
    expect(staffHousingKept).toEqual({
      guestName: 'Maria Lopez',
      planyoId: 'P1',
      csvHousing: 'Camping',
      keptHousing: 'Dorm',
    })
  })

  it('does not report a staff-set guest when the CSV agrees', () => {
    const { merged, staffHousingKept } = mergeImportedGuest(
      stored({ housingType: 'Dorm', housingSetByStaff: true }),
      row({ housingType: 'Dorm', csvHousingType: 'Dorm' })
    )
    expect(merged.housingType).toBe('Dorm')
    expect(staffHousingKept).toBeUndefined()
  })

  it('still updates Housing for a guest staff never edited', () => {
    const { merged, staffHousingKept } = mergeImportedGuest(
      stored({ housingType: 'Dorm' }),
      row({ housingType: 'Camping', csvHousingType: 'Camping' })
    )
    expect(merged.housingType).toBe('Camping')
    expect(staffHousingKept).toBeUndefined()
  })

  it('follows the CSV again once the flag is cleared', () => {
    const { merged } = mergeImportedGuest(
      stored({ housingType: 'Dorm', housingSetByStaff: false }),
      row({ housingType: 'Camping', csvHousingType: 'Camping' })
    )
    expect(merged.housingType).toBe('Camping')
  })

  it('keeps the stored id and merges other fields as before', () => {
    const { merged } = mergeImportedGuest(
      stored({ housingType: 'Dorm', housingSetByStaff: true, internalNotes: 'quiet room', isCancelled: true }),
      row({ housingType: 'Camping', csvHousingType: 'Camping', arrival: 'Sep 20, 2026', notes: '' })
    )
    expect(merged.id).toBe('g1')
    expect(merged.arrival).toBe('Sep 20, 2026')
    expect(merged.internalNotes).toBe('quiet room')
    expect(merged.isCancelled).toBe(false)
  })
})
