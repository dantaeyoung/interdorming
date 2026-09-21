/**
 * Time-based room configuration overrides.
 *
 * The dormitory tree (`dormitories: Dormitory[]`) holds the **base**
 * config. Overrides are dated events that change one attribute on one
 * target for a `[effectiveFrom, effectiveTo]` window (inclusive on both
 * ends; effectiveTo = null means open-ended).
 *
 * Effective config at a date D is computed as:
 *   base + reduce(overrides effective on D)
 *
 * Cascade resolution: dormitory-level overrides cascade to their rooms
 * and beds; a same-window child override (room or bed) wins over the
 * cascade. Within a single level, most-recently-created wins.
 *
 * Presets are NAMED BUNDLES of (target, change) templates. Applying a
 * preset emits one `ConfigOverride` per template entry, all tagged with
 * the preset's id. Reverting a preset application deletes every override
 * with that `presetId` inside the applied window. Presets don't store a
 * snapshot — they're a template that produces overrides on demand, so
 * applying the same preset twice for different dates yields independent
 * applications that can be edited/reverted independently.
 *
 * See `specs/TimeBasedRoomConfig.md` for the full design.
 */

import type { RoomGender } from './Room'

/**
 * What an override targets.
 *
 * - Dormitories are identified by name (unique across the tree).
 * - Rooms are identified by (dormitoryName, roomName) because room
 *   names are only unique within a dormitory.
 * - Beds are identified by `bedId` (globally unique).
 *
 * Using names rather than indices keeps overrides stable across
 * reorderings, base-config edits, and JSON round-trips.
 */
export type OverrideTarget =
  | { kind: 'dormitory'; dormitoryName: string }
  | { kind: 'room'; dormitoryName: string; roomName: string }
  | { kind: 'bed'; bedId: string }

/**
 * What attribute the override changes. `active` applies to all three
 * target kinds; `gender` applies only to room targets (validated at
 * apply-time, not in the type).
 */
export type OverrideAttribute =
  | { attr: 'active'; value: boolean }
  | { attr: 'gender'; value: RoomGender }

export interface ConfigOverride {
  id: string
  target: OverrideTarget
  change: OverrideAttribute
  /**
   * Inclusive start date (ISO YYYY-MM-DD).
   */
  effectiveFrom: string
  /**
   * Inclusive end date (ISO YYYY-MM-DD), or null for open-ended.
   */
  effectiveTo: string | null
  /**
   * If set, this override was emitted by applying a preset; revert
   * deletes every override sharing this `presetId` within the applied
   * window. null = one-off override created by the operator directly.
   */
  presetId: string | null
  /**
   * Identifies the specific application of a preset. Multiple applications
   * of the same preset to different date windows share `presetId` but have
   * distinct `applicationId`s. null for one-off overrides.
   */
  applicationId: string | null
  /**
   * Optional operator-entered reason ("heater broken", "Women's retreat").
   */
  note?: string
  createdAt: string
}

/**
 * One entry in a preset template: which target + which attribute.
 * No date — dates come from the preset application.
 */
export interface PresetTemplateEntry {
  target: OverrideTarget
  change: OverrideAttribute
}

export interface OverridePreset {
  id: string
  name: string
  description?: string
  /**
   * The template entries this preset emits on apply. Editing the
   * preset edits these entries in place; previously-emitted overrides
   * are not retroactively updated (preserves audit history).
   */
  entries: PresetTemplateEntry[]
  createdAt: string
  updatedAt: string
}
