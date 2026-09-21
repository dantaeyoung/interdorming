import type { Guest } from '@/types'

export interface StaffHousingKept {
  guestName: string
  planyoId?: string
  csvHousing: string
  keptHousing: string
}

/**
 * Merge an active CSV row into the stored guest it matched (Add & Update).
 *
 * A non-empty incoming value overwrites; a blank one leaves the stored
 * value alone. The one exception is `housingType` on a guest whose
 * Housing an operator set by hand (`housingSetByStaff`): the CSV's
 * category is recorded in `csvHousingType` but never replaces the
 * operator's choice. When the two differ, `staffHousingKept` describes
 * the disagreement for the import summary.
 */
export function mergeImportedGuest(
  existing: Guest,
  incoming: Guest
): { merged: Guest; staffHousingKept?: StaffHousingKept } {
  const merged: Record<string, unknown> = {
    ...existing,
    // Reactivation: clear cancelled flag if it was set.
    isCancelled: false,
  }
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'id' || key === 'importOrder') continue
    if (key === 'housingType' && existing.housingSetByStaff) continue
    if (value !== undefined && value !== '' && value !== null) {
      merged[key] = value
    }
  }

  const result = { merged: merged as unknown as Guest }
  const csvHousing = incoming.csvHousingType
  const keptHousing = existing.housingType || ''
  if (
    existing.housingSetByStaff &&
    csvHousing &&
    csvHousing.toLowerCase() !== keptHousing.toLowerCase()
  ) {
    return {
      ...result,
      staffHousingKept: {
        guestName: `${existing.firstName || ''} ${existing.lastName || ''}`.trim(),
        planyoId: existing.planyoId || incoming.planyoId || undefined,
        csvHousing,
        keptHousing,
      },
    }
  }
  return result
}
