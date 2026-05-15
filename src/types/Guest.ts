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
