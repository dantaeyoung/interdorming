/**
 * @deprecated Superseded by the base-config + dated-overrides model in
 * `specs/TimeBasedRoomConfig.md`. Kept around for one release so the
 * one-time migration dialog (`LayoutMigrationDialog.vue`) can read the
 * persisted snapshots and convert them into preset templates. New code
 * should use `OverridePreset` + `ConfigOverride` instead.
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
