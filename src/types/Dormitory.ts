/**
 * Dormitory data model
 * Represents a dormitory building containing multiple rooms
 */

import type { Room } from './Room'

export interface Dormitory {
  dormitoryName: string
  active: boolean
  color?: string
  rooms: Room[]
}

/**
 * Dormitory input for creation/editing
 */
export type DormitoryInput = {
  dormitoryName: string
  active?: boolean
  color?: string
  rooms?: Room[]
}
