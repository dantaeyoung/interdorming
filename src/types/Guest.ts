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
  /**
   * True once an operator has changed `housingType` by hand in the guest
   * form (e.g. moving a camper into a free dorm bed). CSV re-imports then
   * leave `housingType` alone. Cleared by "Use CSV value" in the form.
   */
  housingSetByStaff?: boolean
  /**
   * The Housing category the most recent CSV import resolved for this
   * guest, kept whether or not `housingSetByStaff` is set, so the form
   * and import summary can show what the CSV says.
   */
  csvHousingType?: string
  /**
   * Raw accommodation choice from the registration CSV's `Room` column,
   * where guests pick their own spot (e.g. "CrystalSunshine Rm 1
   * ( female only) - bed 7", "CampingCouples", "Canvas Tent1-bed1").
   *
   * Free text, carried for the operator to read. Used to derive
   * `housingType` when the CSV's own Housing column is blank.
   *
   * NOT used to assign a bed: the registration form's bed numbers come
   * from a different source than the room configuration's bed
   * positions, so the two numbering schemes cannot be mapped onto each
   * other.
   */
  roomRequest?: string
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
