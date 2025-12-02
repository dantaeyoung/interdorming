/**
 * Room data model
 * Represents a room within a dormitory containing multiple beds
 */

import type { Bed } from './Bed'

export type RoomGender = 'M' | 'F' | 'Coed'

export interface Room {
  roomName: string
  roomGender: RoomGender
  active: boolean
  beds: Bed[]
}

/**
 * Flattened room structure for backward compatibility
 * Includes dormitory name when rooms are extracted from dormitories
 */
export interface FlatRoom extends Room {
  dormitoryName: string
}

/**
 * Room input for creation/editing
 */
export type RoomInput = {
  roomName: string
  roomGender: RoomGender
  active?: boolean
  beds?: Bed[]
}
