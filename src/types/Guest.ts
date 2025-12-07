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
  notes?: string
  retreat?: string
  ratePerNight?: string
  priceQuoted?: string
  amountPaid?: string
  firstVisit?: string
  roomPreference?: string
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
