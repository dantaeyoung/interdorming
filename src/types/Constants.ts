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
export const ROOM_GENDERS: RoomGender[] = ['M', 'F', 'Coed', 'NB']

/**
 * Coerce a raw string from a CSV cell to a valid `RoomGender`.
 *
 * Case-insensitive and accepts the common aliases operators type by
 * habit (`male` → `M`, `female` → `F`, `mixed` / `co-ed` → `Coed`).
 * Falls back to `'M'` when missing or unrecognized so a typo can't
 * smuggle an arbitrary string into the dorm config.
 */
export function parseRoomGender(val: string | undefined | null): RoomGender {
  const lower = val?.trim().toLowerCase()
  if (!lower) return 'M'
  if (lower === 'm' || lower === 'male') return 'M'
  if (lower === 'f' || lower === 'female') return 'F'
  if (lower === 'coed' || lower === 'mixed' || lower === 'co-ed') return 'Coed'
  if (
    lower === 'nb' ||
    lower === 'non-binary' ||
    lower === 'nonbinary' ||
    lower === 'enby'
  ) return 'NB'
  return 'M'
}

/**
 * Coerce a raw string from a CSV cell to a valid `BedType`.
 * Case-insensitive; falls back to `'single'` for missing/unknown values.
 */
export function parseBedType(val: string | undefined | null): BedType {
  const normalized = val?.trim().toLowerCase()
  if (normalized && (BED_TYPES as readonly string[]).includes(normalized)) {
    return normalized as BedType
  }
  return 'single'
}

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
  roomRequest: ['roomRequest', 'Room', 'ROOM', 'room', 'Room Assignment', 'room_assignment'],
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
 *   - ACTIVE     → imported and kept as live guests. Any status that
 *                  contains "reserved" (case-insensitive) AND does NOT
 *                  contain "cancel" counts. This catches the Planyo
 *                  variants the strict whitelist used to miss:
 *                    - "Reserved"
 *                    - "Reserved + Email address verified"
 *                    - "Reserved + Email address verified + confirmed"
 *                    - "Reserved (rebooked)" / re-confirmed variants
 *                    - any future tweak that still contains the word.
 *   - CANCELLED  → matched against existing guests; if the same person
 *                  was previously active, the existing record is flagged
 *                  cancelled (kept in data so operator decides). New
 *                  cancelled rows with no existing match are skipped.
 *                  Detected by case-insensitive substring "cancel" —
 *                  takes precedence over "reserved" so a hybrid like
 *                  "Reserved → Cancelled" classifies as cancelled.
 *   - OTHER      → e.g. "Not completed", "Pending", "Added to waiting
 *                  list". Skipped on import, and DO NOT touch any
 *                  existing record either. Operator may resubmit later
 *                  when status changes. The re-import diff modal lists
 *                  each skipped new row by name so the operator can
 *                  spot a typo (or, with waitlist entries, just
 *                  confirm the expected drop).
 *
 * If the CSV has no status column at all, every row is treated as
 * active (backwards compat for non-Planyo sources).
 */
export function isActiveReservationStatus(status: string | undefined | null): boolean {
  if (!status) return true // Legacy / non-status sources stay active
  const lower = status.trim().toLowerCase()
  if (!lower) return true
  // Cancellations take precedence — a "Reserved → Cancelled" hybrid is
  // a cancellation, not active.
  if (lower.includes('cancel')) return false
  return lower.includes('reserved')
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
 * Canonical housing categories. Every guest ends up in exactly one of
 * these after import — the `Room` column is used to derive a category
 * whenever the CSV's `Housing type` cell is blank.
 */
export const HOUSING_TYPES = ['Dorm', 'Camping', 'Commuter', 'Canvas Tent'] as const

export type HousingType = (typeof HOUSING_TYPES)[number]

/**
 * Housing types that are NOT assignable to dorm beds.
 *
 * Canvas Tent is label-only: the registration CSV names tent beds
 * (`Canvas Tent1-bed1`), but those beds are not modelled in the room
 * configuration, so tent occupants are excluded from the bed list.
 *
 * Compared lowercase against the guest's housingType, so entries here
 * must be lowercase.
 */
export const NON_ASSIGNABLE_HOUSING_TYPES = ['camping', 'commuter', 'canvas tent']

/**
 * Rules mapping a raw `Room` value to a housing category. Evaluated in
 * order — FIRST MATCH WINS, so ordering is significant.
 *
 * `comm+uter` tolerates the doubled-m misspelling ("Commmuter") seen in
 * real registration data.
 */
const ROOM_TO_HOUSING_RULES: Array<{ pattern: RegExp; housing: HousingType }> = [
  { pattern: /^comm+uter/i, housing: 'Commuter' },
  { pattern: /^camping/i, housing: 'Camping' },
  { pattern: /^canvas\s*tent/i, housing: 'Canvas Tent' },
]

/**
 * Normalizes a raw CSV cell for housing/room comparison.
 *
 * Planyo multi-select columns export as a bare "," when nothing is
 * chosen, and append a trailing comma when something is ("Dorm,"), so
 * both need stripping before the value means anything.
 */
export function cleanHousingCell(value: string | undefined | null): string {
  if (!value) return ''
  return value.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim()
}

/**
 * Derives a housing category from a raw `Room` value.
 *
 * Returns 'Dorm' for any non-empty value that matches no specific rule:
 * an unrecognized room string means the guest chose *something*, and
 * defaulting to Dorm keeps them visible in the unassigned list. Failing
 * toward "the operator sees them" beats failing toward "they silently
 * disappear".
 *
 * Returns undefined only for a genuinely empty value.
 */
export function deriveHousingFromRoom(
  roomRequest: string | undefined | null
): HousingType | undefined {
  const cleaned = cleanHousingCell(roomRequest)
  if (!cleaned) return undefined

  for (const { pattern, housing } of ROOM_TO_HOUSING_RULES) {
    if (pattern.test(cleaned)) return housing
  }

  // Catch-all: named a room of some kind (a dorm room, an RV site, or
  // something we don't recognize) — they need a bed.
  return 'Dorm'
}

/**
 * Maps a stated `Housing type` value onto canonical casing.
 *
 * A value matching none of the canonical categories is preserved
 * verbatim rather than forced into a bucket — this protects legacy
 * values such as "BCM-RV" that predate this categorization.
 */
export function normalizeHousingType(value: string | undefined | null): string {
  const cleaned = cleanHousingCell(value)
  if (!cleaned) return ''

  const match = HOUSING_TYPES.find(h => h.toLowerCase() === cleaned.toLowerCase())
  return match ?? cleaned
}

/**
 * Resolves the housing category for one imported row.
 *
 * A stated `Housing type` always wins — the registration system's
 * explicit answer is never overwritten by inference from `Room`. When
 * the two disagree, the caller is told via `conflict` so the operator
 * can resolve it, rather than the disagreement being settled silently.
 *
 * When neither column says anything, defaults to 'Dorm', matching the
 * behavior a blank housingType already produces (see
 * `guestStore.assignableGuests`).
 */
export function resolveHousingType(
  statedHousing: string | undefined | null,
  roomRequest: string | undefined | null
): { housingType: string; conflict?: { stated: string; impliedByRoom: HousingType } } {
  const stated = normalizeHousingType(statedHousing)
  const implied = deriveHousingFromRoom(roomRequest)

  if (stated) {
    if (implied && implied.toLowerCase() !== stated.toLowerCase()) {
      return { housingType: stated, conflict: { stated, impliedByRoom: implied } }
    }
    return { housingType: stated }
  }

  return { housingType: implied ?? 'Dorm' }
}

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
