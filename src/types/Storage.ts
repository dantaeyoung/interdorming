/**
 * Storage data models
 * Data structures for localStorage persistence
 */

import type { Guest } from './Guest'
import type { AssignmentEntry, SerializedHistoryState } from './Assignment'
import type { Dormitory } from './Dormitory'
import type { Settings } from './Settings'

/**
 * Complete application state stored in localStorage
 */
export interface StorageData {
  guests: Guest[]
  assignments: AssignmentEntry[]
  dormitories: Dormitory[]
  settings?: Settings
  assignmentHistory: SerializedHistoryState[]
  version: string
}

/**
 * Legacy storage data structure for migration
 */
export interface LegacyStorageData {
  guests: Guest[]
  assignments: AssignmentEntry[]
  rooms?: any[]
  dormitories?: Dormitory[]
  settings?: Settings
  assignmentHistory?: SerializedHistoryState[]
  version?: string
}
