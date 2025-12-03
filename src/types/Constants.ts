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
  notes: ['notes', 'NOTES', 'Notes', 'Note'],
  retreat: ['retreat', 'RETREAT', 'Retreat'],
  ratePerNight: ['ratePerNight', 'Rate per night', 'RATE PER NIGHT', 'Rate Per Night', 'rate_per_night'],
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
