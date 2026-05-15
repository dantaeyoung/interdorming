/**
 * Application constants and configuration values
 */

import type { BedType } from './Bed'
import type { RoomGender } from './Room'

/**
 * Data and storage constants
 */
export const DATA_VERSION = '2.0'
export const SETTINGS_VERSION = '1.0'
export const STORAGE_KEY = 'dormAssignments'
export const HISTORY_SIZE = 10

/**
 * Default colors
 */
export const DEFAULT_COLORS = {
  DORMITORY: '#f8f9fa',
  ACCENT: '#4299e1',
}

/**
 * Bed and room configuration
 */
export const BED_TYPES: BedType[] = ['upper', 'lower', 'single']
export const ROOM_GENDERS: RoomGender[] = ['M', 'F', 'Coed']

/**
 * CSV field mappings for flexible column name support
 */
export const CSV_FIELD_MAPPINGS: Record<string, string[]> = {
  firstName: ['firstName', 'FIRST NAME', 'First Name', 'first_name'],
  lastName: ['lastName', 'LAST NAME', 'Last Name', 'last_name'],
  preferredName: ['preferredName', 'PREFERRED NAME', 'Preferred Name', 'preferred_name'],
  gender: ['gender', 'GENDER', 'Gender'],
  age: ['age', 'AGE', 'Age'],
  groupName: ['groupName', 'GROUP NAME', 'Group Name', 'group_name', 'GroupName', 'GROUP'],
  lowerBunk: [
    'lowerBunk',
    'LOWER BUNK',
    'Lower Bunk',
    'lower_bunk',
    'Lower bunk?',
    'lowerBunk?',
  ],
  arrival: ['arrival', 'ARRIVAL', 'Arrival', 'arrival_date'],
  departure: ['departure', 'DEPARTURE', 'Departure', 'departure_date'],
  indivGrp: ['indivGrp', 'Indiv/Grp?', 'INDIV/GRP?', 'Indiv/Grp', 'indiv_grp'],
  email: ['email', 'EMAIL', 'Email', 'E-mail', 'e-mail', 'Email Address', 'email_address'],
  notes: ['notes', 'NOTES', 'Notes', 'Note'],
  retreat: ['retreat', 'RETREAT', 'Retreat'],
  ratePerNight: ['ratePerNight', 'Rate per night', 'RATE PER NIGHT', 'Rate Per Night', 'rate_per_night'],
  priceQuoted: ['priceQuoted', 'Price quoted', 'PRICE QUOTED', 'Price Quoted', 'price_quoted'],
  amountPaid: ['amountPaid', 'Amount paid', 'AMOUNT PAID', 'Amount Paid', 'amount_paid'],
  firstVisit: ['firstVisit', 'First visit to a TNH monastery', 'FIRST VISIT TO A TNH MONASTERY', 'First Visit', 'first_visit'],
  roomPreference: ['roomPreference', 'Rm Preference', 'RM PREFERENCE', 'Room Preference', 'room_preference', 'Rm preference'],
  housingType: ['housingType', 'Housing type', 'HOUSING TYPE', 'Housing Type', 'housing_type'],
  accommodationChoice: ['accommodationChoice', 'Accommodation Choice', 'ACCOMMODATION CHOICE', 'accommodation_choice'],
  creationDate: ['creationDate', 'Creation Date', 'CREATION DATE', 'creation_date'],
  groupOrIndiv: ['groupOrIndiv', 'Group or Indiv?', 'GROUP OR INDIV?', 'Group or Indiv', 'group_or_indiv'],
  arrivalTime: ['arrivalTime', 'Arrival time', 'ARRIVAL TIME', 'Arrival Time', 'arrival_time'],
  departureMeals: ['departureMeals', 'Departure Meals', 'DEPARTURE MEALS', 'departure_meals'],
  mentalHealth: ['mentalHealth', 'Mental Health', 'MENTAL HEALTH', 'mental_health'],
  physicalHealth: ['physicalHealth', 'Physical Health', 'PHYSICAL HEALTH', 'physical_health'],
  planyoId: ['planyoId', 'ID', 'Reservation ID', 'Reservation #', 'Planyo ID', 'Booking ID', 'Reservation Number', 'reservation_id'],
  status: ['status', 'Status', 'STATUS', 'Reservation Status', 'reservation_status'],
}

/**
 * Reservation status falls into three categories:
 *   - ACTIVE     → imported and kept as live guests. Whitelist below.
 *   - CANCELLED  → matched against existing guests; if the same person
 *                  was previously active, the existing record is flagged
 *                  cancelled (kept in data so operator decides). New
 *                  cancelled rows with no existing match are skipped.
 *                  Detected by case-insensitive substring "cancel".
 *   - OTHER      → e.g. "Not completed". Silently skipped on import,
 *                  and DO NOT touch any existing record either. Operator
 *                  may resubmit later when status changes.
 *
 * If the CSV has no status column at all, every row is treated as
 * active (backwards compat for non-Planyo sources).
 */
export const ACTIVE_RESERVATION_STATUSES = new Set([
  'reserved',
  'reserved + email address verified + confirmed',
])

export function isActiveReservationStatus(status: string | undefined | null): boolean {
  if (!status) return true // Legacy / non-status sources stay active
  return ACTIVE_RESERVATION_STATUSES.has(status.trim().toLowerCase())
}

/**
 * True if the status indicates a cancellation. Case-insensitive
 * substring match on "cancel" so variants like "Cancelled by admin",
 * "Cancellation requested", "Cancelled" are all caught.
 *
 * Returns false for missing status, "Not completed", and anything else
 * that doesn't mention cancellation.
 */
export function isCancelledStatus(status: string | undefined | null): boolean {
  if (!status) return false
  return status.toLowerCase().includes('cancel')
}

/**
 * Housing types that are NOT assignable to dorm beds
 */
export const NON_ASSIGNABLE_HOUSING_TYPES = ['camping', 'commuter']

/**
 * UI Messages
 */
export const MESSAGES = {
  NO_GUESTS: 'No guests loaded. Upload a CSV file to begin assigning guests to dormitory beds.',
  NO_ROOMS: 'No rooms configured. Room layout will appear here once guest data is loaded.',
  NO_DORMITORIES: 'No dormitories configured. Click "Add Dormitory" to create your first dormitory.',
  ALL_ASSIGNED: 'All guests have been assigned to rooms.',
  SELECT_DORMITORY: 'Select a dormitory to configure its rooms.',
  NO_DORMITORY_SELECTED: 'No dormitory selected',
}
