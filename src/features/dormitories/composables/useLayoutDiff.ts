/**
 * Diff one RoomLayout tree against the chosen base, producing a set of
 * preset template entries that — when applied as overrides — would
 * morph the base into the other layout *for attribute-level differences*.
 *
 * Overrides can only flip three attributes (`dorm.active`, `room.active`,
 * `room.roomGender`, `bed.active`). Anything structural — added or
 * removed dormitories, rooms, or beds; bed type / position changes;
 * dormitory name reshuffling — is **lossy** and surfaces as a list of
 * `structuralWarnings` the caller can show in the migration dialog.
 *
 * Used by the one-time "Multiple Layouts → Base + Presets" migration:
 * see specs/TimeBasedRoomConfig.md §Migration.
 */

import type { Dormitory, RoomLayout, PresetTemplateEntry } from '@/types'

export interface LayoutDiffResult {
  entries: PresetTemplateEntry[]
  structuralWarnings: string[]
}

export function diffLayoutToPresetEntries(
  base: Dormitory[],
  other: Dormitory[]
): LayoutDiffResult {
  const entries: PresetTemplateEntry[] = []
  const warnings: string[] = []

  const baseDormByName = new Map(base.map(d => [d.dormitoryName, d]))
  const otherDormByName = new Map(other.map(d => [d.dormitoryName, d]))

  // Detect added/removed dormitories — not representable as overrides.
  for (const d of base) {
    if (!otherDormByName.has(d.dormitoryName)) {
      warnings.push(`Dormitory "${d.dormitoryName}" is missing in this layout — overrides can't remove a dormitory.`)
    }
  }
  for (const d of other) {
    if (!baseDormByName.has(d.dormitoryName)) {
      warnings.push(`Dormitory "${d.dormitoryName}" is new in this layout — overrides can't add a dormitory.`)
    }
  }

  // For every dormitory present in BOTH, diff attributes + descend.
  for (const baseDorm of base) {
    const otherDorm = otherDormByName.get(baseDorm.dormitoryName)
    if (!otherDorm) continue

    if (baseDorm.active !== otherDorm.active) {
      entries.push({
        target: { kind: 'dormitory', dormitoryName: baseDorm.dormitoryName },
        change: { attr: 'active', value: otherDorm.active },
      })
    }

    diffRooms(baseDorm, otherDorm, entries, warnings)
  }

  return { entries, structuralWarnings: warnings }
}

function diffRooms(
  baseDorm: Dormitory,
  otherDorm: Dormitory,
  entries: PresetTemplateEntry[],
  warnings: string[]
): void {
  const baseRoomByName = new Map(baseDorm.rooms.map(r => [r.roomName, r]))
  const otherRoomByName = new Map(otherDorm.rooms.map(r => [r.roomName, r]))

  for (const r of baseDorm.rooms) {
    if (!otherRoomByName.has(r.roomName)) {
      warnings.push(`Room "${baseDorm.dormitoryName} / ${r.roomName}" is missing in this layout.`)
    }
  }
  for (const r of otherDorm.rooms) {
    if (!baseRoomByName.has(r.roomName)) {
      warnings.push(`Room "${otherDorm.dormitoryName} / ${r.roomName}" is new in this layout.`)
    }
  }

  for (const baseRoom of baseDorm.rooms) {
    const otherRoom = otherRoomByName.get(baseRoom.roomName)
    if (!otherRoom) continue

    if (baseRoom.active !== otherRoom.active) {
      entries.push({
        target: { kind: 'room', dormitoryName: baseDorm.dormitoryName, roomName: baseRoom.roomName },
        change: { attr: 'active', value: otherRoom.active },
      })
    }
    if (baseRoom.roomGender !== otherRoom.roomGender) {
      entries.push({
        target: { kind: 'room', dormitoryName: baseDorm.dormitoryName, roomName: baseRoom.roomName },
        change: { attr: 'gender', value: otherRoom.roomGender },
      })
    }

    diffBeds(baseDorm.dormitoryName, baseRoom.roomName, baseRoom.beds, otherRoom.beds, entries, warnings)
  }
}

function diffBeds(
  dormName: string,
  roomName: string,
  baseBeds: Array<{ bedId: string; active?: boolean; bedType: string; position: number }>,
  otherBeds: Array<{ bedId: string; active?: boolean; bedType: string; position: number }>,
  entries: PresetTemplateEntry[],
  warnings: string[]
): void {
  const baseBedById = new Map(baseBeds.map(b => [b.bedId, b]))
  const otherBedById = new Map(otherBeds.map(b => [b.bedId, b]))

  for (const b of baseBeds) {
    if (!otherBedById.has(b.bedId)) {
      warnings.push(`Bed "${b.bedId}" (${dormName} / ${roomName}) is missing in this layout.`)
    }
  }
  for (const b of otherBeds) {
    if (!baseBedById.has(b.bedId)) {
      warnings.push(`Bed "${b.bedId}" (${dormName} / ${roomName}) is new in this layout.`)
    }
  }

  for (const baseBed of baseBeds) {
    const otherBed = otherBedById.get(baseBed.bedId)
    if (!otherBed) continue

    const baseActive = baseBed.active !== false
    const otherActive = otherBed.active !== false
    if (baseActive !== otherActive) {
      entries.push({
        target: { kind: 'bed', bedId: baseBed.bedId },
        change: { attr: 'active', value: otherActive },
      })
    }
    if (baseBed.bedType !== otherBed.bedType || baseBed.position !== otherBed.position) {
      warnings.push(`Bed "${baseBed.bedId}" has type/position differences (not representable as an override).`)
    }
  }
}

/**
 * Convenience: build preset payloads for every "other" layout from a
 * picked base. Returns one entry per layout: (sourceLayout, diff).
 * Layouts whose diff is empty are filtered out — no point creating an
 * empty preset.
 */
export function buildPresetPayloadsFromLayouts(
  baseLayout: RoomLayout,
  otherLayouts: RoomLayout[]
): Array<{ sourceLayout: RoomLayout; diff: LayoutDiffResult }> {
  const out: Array<{ sourceLayout: RoomLayout; diff: LayoutDiffResult }> = []
  for (const other of otherLayouts) {
    if (other.id === baseLayout.id) continue
    const diff = diffLayoutToPresetEntries(baseLayout.dormitories, other.dormitories)
    if (diff.entries.length === 0 && diff.structuralWarnings.length === 0) continue
    out.push({ sourceLayout: other, diff })
  }
  return out
}
