/**
 * Central export point for all type definitions
 */

// Guest types
export type { Guest, GuestInput, GuestCSVRow, Gender } from './Guest'

// Bed types
export type { Bed, BedInput, BedType } from './Bed'

// Room types
export type { Room, FlatRoom, RoomInput, RoomGender } from './Room'

// Dormitory types
export type { Dormitory, DormitoryInput } from './Dormitory'

// Assignment types
export type {
  AssignmentMap,
  AssignmentEntry,
  HistoryState,
  SerializedHistoryState,
  SuggestedAssignmentMap,
} from './Assignment'

// Validation types
export type { WarningType, ValidationWarning, ValidationResult } from './Validation'

// Settings types
export type {
  Settings,
  WarningSettings,
  DisplaySettings,
  AutoPlacementSettings,
  AutoPlacementPriority,
} from './Settings'
export { DEFAULT_SETTINGS } from './Settings'

// Storage types
export type { StorageData, LegacyStorageData } from './Storage'

// Constants
export {
  DATA_VERSION,
  SETTINGS_VERSION,
  STORAGE_KEY,
  HISTORY_SIZE,
  DEFAULT_COLORS,
  BED_TYPES,
  ROOM_GENDERS,
  CSV_FIELD_MAPPINGS,
  MESSAGES,
} from './Constants'
