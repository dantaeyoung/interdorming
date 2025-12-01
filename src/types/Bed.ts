/**
 * Bed data model
 * Represents a single bed within a room
 */

export type BedType = 'upper' | 'lower' | 'single'

export interface Bed {
  bedId: string
  bedType: BedType
  assignedGuestId: string | null
  position: number
  active?: boolean
}

/**
 * Bed input for creation/editing
 */
export type BedInput = Omit<Bed, 'assignedGuestId'> & {
  assignedGuestId?: string | null
}
