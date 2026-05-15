/**
 * Bed data model
 * Represents a single bed within a room
 */

export type BedType = 'upper' | 'lower' | 'single'

/**
 * A single guest's claim on a bed.
 *
 * Dates are NOT stored here — they're derived from the guest record at
 * read time (single source of truth = guest's arrival/departure). This
 * keeps the assignment in sync automatically when guest dates are edited.
 */
export interface BedAssignment {
  guestId: string
}

export interface Bed {
  bedId: string
  bedType: BedType
  /**
   * All guests currently assigned to this bed. Multiple entries are allowed
   * as long as their stays (derived from guest arrival/departure) don't
   * overlap. Empty array = bed is unassigned.
   */
  assignments: BedAssignment[]
  position: number
  active?: boolean
}

/**
 * Bed input for creation/editing
 */
export type BedInput = Omit<Bed, 'assignments'> & {
  assignments?: BedAssignment[]
}
