/**
 * Assignment data models
 * Represents guest-to-bed assignments and history state
 */

import type { Room } from './Room'
import type { Dormitory } from './Dormitory'

/**
 * Assignment map: guestId -> bedId
 */
export type AssignmentMap = Map<string, string>

/**
 * Serialized assignment for localStorage
 */
export type AssignmentEntry = [string, string]

/**
 * Assignment history state for undo/redo
 */
export interface HistoryState {
  assignments: AssignmentMap
  rooms: Room[]
  dormitories: Dormitory[] | null
}

/**
 * Serialized history state for localStorage
 */
export interface SerializedHistoryState {
  assignments: AssignmentEntry[]
  rooms: Room[]
  dormitories: Dormitory[] | null
}

/**
 * Suggested assignment from auto-placement
 */
export type SuggestedAssignmentMap = Map<string, string>
