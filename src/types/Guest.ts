/**
 * Guest data model
 * Represents a retreat guest with personal information and preferences
 */

export type Gender = 'M' | 'F' | 'Non-binary/Other'

export interface Guest {
  id: string
  firstName: string
  lastName: string
  preferredName?: string
  gender: Gender
  age: number | string
  groupName?: string
  lowerBunk?: boolean
  arrival?: string
  departure?: string
  indivGrp?: string
  email?: string
  notes?: string
  /**
   * Operator-created notes added inside the app, distinct from the
   * CSV-imported `notes` field. Never overwritten by CSV re-imports.
   */
  internalNotes?: string
  retreat?: string
  ratePerNight?: string
  priceQuoted?: string
  amountPaid?: string
  firstVisit?: string
  roomPreference?: string
  housingType?: string
  accommodationChoice?: string
  creationDate?: string
  groupOrIndiv?: string
  arrivalTime?: string
  departureMeals?: string
  mentalHealth?: string
  physicalHealth?: string
  importOrder?: number
  /**
   * Canonical Planyo reservation ID. Used to match the same reservation
   * across CSV re-uploads (the same person can have multiple reservations
   * across retreats, so name is not unique).
   */
  planyoId?: string
  /** Raw status string from the most recent CSV import. */
  status?: string
  /**
   * Derived from `status` — true when the reservation is non-active
   * (cancelled, not completed, etc.). The guest record stays in the
   * data so the operator can manually decide what to do.
   */
  isCancelled?: boolean
}

/**
 * Partial guest for editing/creation
 */
export type GuestInput = Omit<Guest, 'id'>

/**
 * Guest with optional fields for CSV import
 */
export type GuestCSVRow = Partial<Guest> & {
  firstName: string
  lastName: string
  gender: Gender
  age: number | string
}
