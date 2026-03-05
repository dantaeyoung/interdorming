/**
 * Room Layout type
 * Represents a named dormitory configuration preset
 */

import type { Dormitory } from './Dormitory'

export interface RoomLayout {
  id: string
  name: string
  description: string
  dormitories: Dormitory[]
  createdAt: string
  updatedAt: string
}
