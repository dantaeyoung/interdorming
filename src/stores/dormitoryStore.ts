/**
 * Dormitory Store
 * Manages dormitories, rooms, beds, and room layout presets
 */

import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick, toRaw } from 'vue'
import type {
  Dormitory,
  DormitoryInput,
  Room,
  RoomInput,
  Bed,
  FlatRoom,
  RoomLayout,
  ConfigOverride,
  OverridePreset,
  OverrideTarget,
  OverrideAttribute,
  PresetTemplateEntry,
  RoomGender,
} from '@/types'
import { DEFAULT_COLORS } from '@/types'
import { parseLocalDate } from '@/shared/composables/useUtils'

/**
 * Bed-shape schema version. Bump when changing bed structure so migration
 * logic in `migrateBedAssignments` knows when to run.
 *   v1 = single `assignedGuestId: string | null`
 *   v2 = multi `assignments: BedAssignment[]` (date-aware sharing)
 */
const CURRENT_BED_SHAPE_VERSION = 2

export const useDormitoryStore = defineStore(
  'dormitories',
  () => {
    // State
    const dormitories = ref<Dormitory[]>([])
    const configName = ref<string>('')
    const selectedDormitoryIndex = ref<number | null>(null)
    // Default to 1 (legacy) so existing localStorage without this key still
    // triggers migration. Bumped to CURRENT_BED_SHAPE_VERSION after migrate.
    const bedShapeVersion = ref<number>(1)

    // Layout state
    const layouts = ref<RoomLayout[]>([])
    const activeLayoutId = ref<string | null>(null)

    // Time-based overrides + presets (see specs/TimeBasedRoomConfig.md)
    const overrides = ref<ConfigOverride[]>([])
    const presets = ref<OverridePreset[]>([])

    /**
     * One-shot flag flipped after the operator either dismisses or
     * completes the "multi-layout → base + presets" migration. Once true:
     * the layout selector is hidden from the Configuration tab and the
     * `layouts` / `activeLayoutId` fields become read-only legacy state
     * (kept around for one release as a safety net per the spec).
     *
     * Defaults to false so first load after this code ships triggers the
     * migration check; one-layout (or empty) sessions silently flip it
     * during initialization so no dialog appears.
     */
    const layoutMigrationComplete = ref<boolean>(false)

    // Internal flag to suppress auto-save during layout switch
    let _suppressAutoSave = false

    // Getters
    const getAllRooms = computed((): FlatRoom[] => {
      const flatRooms: FlatRoom[] = []
      dormitories.value.forEach(dormitory => {
        if (dormitory.active) {
          dormitory.rooms.forEach(room => {
            if (room.active) {
              flatRooms.push({
                ...room,
                dormitoryName: dormitory.dormitoryName,
              })
            }
          })
        }
      })
      return flatRooms
    })

    const getAllBeds = computed((): Bed[] => {
      const allBeds: Bed[] = []
      dormitories.value.forEach(dormitory => {
        if (dormitory.active) {
          dormitory.rooms.forEach(room => {
            if (room.active) {
              allBeds.push(...room.beds.filter(bed => bed.active !== false))
            }
          })
        }
      })
      return allBeds
    })

    // Pre-built lookup maps for O(1) bed lookups (rebuilt when dormitories change)
    const bedLookupMap = computed(() => {
      const bedMap = new Map<string, Bed>()
      const roomMap = new Map<string, FlatRoom>()
      const dormMap = new Map<string, Dormitory>()
      for (const dormitory of dormitories.value) {
        for (const room of dormitory.rooms) {
          const flatRoom: FlatRoom = { ...room, dormitoryName: dormitory.dormitoryName }
          for (const bed of room.beds) {
            bedMap.set(bed.bedId, bed)
            roomMap.set(bed.bedId, flatRoom)
            dormMap.set(bed.bedId, dormitory)
          }
        }
      }
      return { bedMap, roomMap, dormMap }
    })

    const getBedById = computed(() => {
      return (bedId: string): Bed | undefined => {
        return bedLookupMap.value.bedMap.get(bedId)
      }
    })

    const getRoomByBedId = computed(() => {
      return (bedId: string): FlatRoom | undefined => {
        return bedLookupMap.value.roomMap.get(bedId)
      }
    })

    const getDormitoryByBedId = computed(() => {
      return (bedId: string): Dormitory | undefined => {
        return bedLookupMap.value.dormMap.get(bedId)
      }
    })

    const selectedDormitory = computed(() => {
      if (selectedDormitoryIndex.value !== null && selectedDormitoryIndex.value >= 0) {
        return dormitories.value[selectedDormitoryIndex.value]
      }
      return null
    })

    const activeLayout = computed((): RoomLayout | null => {
      if (!activeLayoutId.value) return null
      return layouts.value.find(l => l.id === activeLayoutId.value) || null
    })

    // Actions
    function addDormitory(dormitoryInput: DormitoryInput) {
      const dormitory: Dormitory = {
        dormitoryName: dormitoryInput.dormitoryName,
        active: dormitoryInput.active !== undefined ? dormitoryInput.active : true,
        color: dormitoryInput.color || DEFAULT_COLORS.DORMITORY,
        rooms: dormitoryInput.rooms || [],
      }
      dormitories.value.push(dormitory)
      return dormitory
    }

    function updateDormitory(index: number, updates: Partial<DormitoryInput>) {
      if (index >= 0 && index < dormitories.value.length) {
        dormitories.value[index] = { ...dormitories.value[index], ...updates }
      }
    }

    function deleteDormitory(index: number) {
      if (index >= 0 && index < dormitories.value.length) {
        dormitories.value.splice(index, 1)
        if (selectedDormitoryIndex.value === index) {
          selectedDormitoryIndex.value = null
        }
      }
    }

    function addRoom(dormitoryIndex: number, roomInput: RoomInput) {
      if (dormitoryIndex >= 0 && dormitoryIndex < dormitories.value.length) {
        const room: Room = {
          roomName: roomInput.roomName,
          roomGender: roomInput.roomGender,
          active: roomInput.active !== undefined ? roomInput.active : true,
          beds: roomInput.beds || [],
        }
        dormitories.value[dormitoryIndex].rooms.push(room)
        return room
      }
    }

    function updateRoom(dormitoryIndex: number, roomIndex: number, updates: Partial<RoomInput>) {
      if (
        dormitoryIndex >= 0 &&
        dormitoryIndex < dormitories.value.length &&
        roomIndex >= 0 &&
        roomIndex < dormitories.value[dormitoryIndex].rooms.length
      ) {
        const room = dormitories.value[dormitoryIndex].rooms[roomIndex]
        dormitories.value[dormitoryIndex].rooms[roomIndex] = { ...room, ...updates }
      }
    }

    function deleteRoom(dormitoryIndex: number, roomIndex: number) {
      if (
        dormitoryIndex >= 0 &&
        dormitoryIndex < dormitories.value.length &&
        roomIndex >= 0 &&
        roomIndex < dormitories.value[dormitoryIndex].rooms.length
      ) {
        dormitories.value[dormitoryIndex].rooms.splice(roomIndex, 1)
      }
    }

    function addBed(dormitoryIndex: number, roomIndex: number, bed: Bed) {
      if (
        dormitoryIndex >= 0 &&
        dormitoryIndex < dormitories.value.length &&
        roomIndex >= 0 &&
        roomIndex < dormitories.value[dormitoryIndex].rooms.length
      ) {
        dormitories.value[dormitoryIndex].rooms[roomIndex].beds.push(bed)
      }
    }

    function updateBed(dormitoryIndex: number, roomIndex: number, bedIndex: number, updates: Partial<Bed>) {
      if (
        dormitoryIndex >= 0 &&
        dormitoryIndex < dormitories.value.length &&
        roomIndex >= 0 &&
        roomIndex < dormitories.value[dormitoryIndex].rooms.length &&
        bedIndex >= 0 &&
        bedIndex < dormitories.value[dormitoryIndex].rooms[roomIndex].beds.length
      ) {
        const bed = dormitories.value[dormitoryIndex].rooms[roomIndex].beds[bedIndex]
        dormitories.value[dormitoryIndex].rooms[roomIndex].beds[bedIndex] = { ...bed, ...updates }
      }
    }

    function deleteBed(dormitoryIndex: number, roomIndex: number, bedIndex: number) {
      if (
        dormitoryIndex >= 0 &&
        dormitoryIndex < dormitories.value.length &&
        roomIndex >= 0 &&
        roomIndex < dormitories.value[dormitoryIndex].rooms.length &&
        bedIndex >= 0 &&
        bedIndex < dormitories.value[dormitoryIndex].rooms[roomIndex].beds.length
      ) {
        dormitories.value[dormitoryIndex].rooms[roomIndex].beds.splice(bedIndex, 1)
      }
    }

    function setSelectedDormitory(index: number | null) {
      selectedDormitoryIndex.value = index
    }

    function initializeDefaultDormitories() {
      dormitories.value = [
        {
          dormitoryName: 'Main Building',
          active: true,
          color: '#f8f9fa',
          rooms: [
            {
              roomName: "Men's Dorm A",
              roomGender: 'M',
              active: true,
              beds: [
                { bedId: 'MA1', bedType: 'lower', assignments: [], position: 1 },
                { bedId: 'MA2', bedType: 'upper', assignments: [], position: 2 },
                { bedId: 'MA3', bedType: 'lower', assignments: [], position: 3 },
                { bedId: 'MA4', bedType: 'upper', assignments: [], position: 4 },
                { bedId: 'MA5', bedType: 'single', assignments: [], position: 5 },
                { bedId: 'MA6', bedType: 'single', assignments: [], position: 6 },
              ],
            },
            {
              roomName: "Men's Dorm B",
              roomGender: 'M',
              active: true,
              beds: [
                { bedId: 'MB1', bedType: 'lower', assignments: [], position: 1 },
                { bedId: 'MB2', bedType: 'upper', assignments: [], position: 2 },
                { bedId: 'MB3', bedType: 'lower', assignments: [], position: 3 },
                { bedId: 'MB4', bedType: 'upper', assignments: [], position: 4 },
              ],
            },
            {
              roomName: "Women's Dorm A",
              roomGender: 'F',
              active: true,
              beds: [
                { bedId: 'WA1', bedType: 'lower', assignments: [], position: 1 },
                { bedId: 'WA2', bedType: 'upper', assignments: [], position: 2 },
                { bedId: 'WA3', bedType: 'lower', assignments: [], position: 3 },
                { bedId: 'WA4', bedType: 'upper', assignments: [], position: 4 },
                { bedId: 'WA5', bedType: 'single', assignments: [], position: 5 },
                { bedId: 'WA6', bedType: 'single', assignments: [], position: 6 },
              ],
            },
            {
              roomName: "Women's Dorm B",
              roomGender: 'F',
              active: true,
              beds: [
                { bedId: 'WB1', bedType: 'lower', assignments: [], position: 1 },
                { bedId: 'WB2', bedType: 'upper', assignments: [], position: 2 },
                { bedId: 'WB3', bedType: 'lower', assignments: [], position: 3 },
                { bedId: 'WB4', bedType: 'upper', assignments: [], position: 4 },
              ],
            },
          ],
        },
        {
          dormitoryName: 'Family Building',
          active: true,
          color: '#f8f9fa',
          rooms: [
            {
              roomName: 'Family Room',
              roomGender: 'Coed',
              active: true,
              beds: [
                { bedId: 'FR1', bedType: 'single', assignments: [], position: 1 },
                { bedId: 'FR2', bedType: 'single', assignments: [], position: 2 },
                { bedId: 'FR3', bedType: 'single', assignments: [], position: 3 },
                { bedId: 'FR4', bedType: 'single', assignments: [], position: 4 },
              ],
            },
          ],
        },
      ]
    }

    /**
     * One-time migration from the legacy bed shape (`assignedGuestId`) to
     * the new date-aware shape (`assignments: BedAssignment[]`).
     *
     * Runs against the live `dormitories` tree AND against every
     * `layout.dormitories` snapshot. Detects need by inspecting actual data
     * shape (any bed missing `assignments` or carrying `assignedGuestId`),
     * not by version stamp — so legacy persisted state without
     * `bedShapeVersion` is still detected.
     *
     * Returns true if migration ran, false if everything was already
     * normalized.
     */
    function migrateBedAssignments(): boolean {
      let mutated = false

      const convertBed = (bed: any) => {
        if (!Array.isArray(bed.assignments)) {
          const legacyId = bed.assignedGuestId
          bed.assignments = legacyId ? [{ guestId: legacyId }] : []
          mutated = true
        }
        if ('assignedGuestId' in bed) {
          delete bed.assignedGuestId
          mutated = true
        }
      }

      const convertDorms = (dorms: any[] | undefined) => {
        if (!Array.isArray(dorms)) return
        for (const dorm of dorms) {
          if (!Array.isArray(dorm.rooms)) continue
          for (const room of dorm.rooms) {
            if (!Array.isArray(room.beds)) continue
            for (const bed of room.beds) {
              convertBed(bed)
            }
          }
        }
      }

      _suppressAutoSave = true
      convertDorms(dormitories.value as any[])
      for (const layout of layouts.value) {
        convertDorms(layout.dormitories as any[])
      }
      if (bedShapeVersion.value < CURRENT_BED_SHAPE_VERSION) {
        bedShapeVersion.value = CURRENT_BED_SHAPE_VERSION
        mutated = true
      }
      nextTick(() => {
        _suppressAutoSave = false
      })

      return mutated
    }

    // Eager migration: run once as soon as data is non-empty (whether
    // from default init, layout switch, or pinia hydration). One-shot
    // watcher keeps perf overhead minimal once normalization is done.
    let _migrationDone = false
    const _stopMigrationWatch = watch(
      [dormitories, layouts],
      () => {
        if (_migrationDone) return
        if (dormitories.value.length === 0 && layouts.value.length === 0) {
          // Wait for hydration / init to populate something
          return
        }
        migrateBedAssignments()
        _migrationDone = true
        _stopMigrationWatch()
      },
      { immediate: true, deep: true, flush: 'sync' }
    )

    function importDormitories(importedDormitories: Dormitory[]) {
      dormitories.value = importedDormitories
    }

    // --- Layout Management ---

    function _deepCloneDormitories(dorms: Dormitory[]): Dormitory[] {
      return JSON.parse(JSON.stringify(dorms))
    }

    /**
     * Migration: if layouts is empty but dormitories exist, create a layout from them.
     * Called on app mount.
     */
    function ensureLayoutsInitialized() {
      if (layouts.value.length > 0) return

      const now = new Date().toISOString()
      const layout: RoomLayout = {
        id: crypto.randomUUID(),
        name: configName.value || 'Default Layout',
        description: '',
        dormitories: _deepCloneDormitories(dormitories.value),
        createdAt: now,
        updatedAt: now,
      }
      layouts.value = [layout]
      activeLayoutId.value = layout.id
    }

    /**
     * Save the current working dormitories to the active layout.
     */
    function saveCurrentToActiveLayout() {
      if (!activeLayoutId.value) return
      const layout = layouts.value.find(l => l.id === activeLayoutId.value)
      if (layout) {
        layout.dormitories = _deepCloneDormitories(dormitories.value)
        layout.updatedAt = new Date().toISOString()
      }
    }

    /**
     * Create a new layout. If cloneFromId is provided, clones that layout's dormitories.
     * Otherwise starts blank.
     */
    function createLayout(name: string, description: string = '', cloneFromId?: string): RoomLayout {
      // Save current layout first
      saveCurrentToActiveLayout()

      const now = new Date().toISOString()
      let newDorms: Dormitory[] = []

      if (cloneFromId) {
        const source = layouts.value.find(l => l.id === cloneFromId)
        if (source) {
          newDorms = _deepCloneDormitories(source.dormitories)
        }
      }

      const layout: RoomLayout = {
        id: crypto.randomUUID(),
        name,
        description,
        dormitories: newDorms,
        createdAt: now,
        updatedAt: now,
      }

      layouts.value.push(layout)

      // Switch to new layout
      _suppressAutoSave = true
      activeLayoutId.value = layout.id
      dormitories.value = _deepCloneDormitories(layout.dormitories)
      configName.value = layout.name
      selectedDormitoryIndex.value = null
      nextTick(() => {
        _suppressAutoSave = false
      })

      return layout
    }

    /**
     * Switch to a different layout. Caller should handle confirmation first.
     * Returns true if switched, false if layout not found.
     */
    function switchLayout(layoutId: string): boolean {
      if (layoutId === activeLayoutId.value) return true

      const target = layouts.value.find(l => l.id === layoutId)
      if (!target) return false

      // Save current layout
      saveCurrentToActiveLayout()

      // Suppress auto-save during switch
      _suppressAutoSave = true
      activeLayoutId.value = target.id
      dormitories.value = _deepCloneDormitories(target.dormitories)
      configName.value = target.name
      selectedDormitoryIndex.value = null
      nextTick(() => {
        _suppressAutoSave = false
      })

      return true
    }

    /**
     * Delete a layout. Cannot delete the last one.
     * Returns true if deleted.
     */
    function deleteLayout(layoutId: string): boolean {
      if (layouts.value.length <= 1) return false

      const index = layouts.value.findIndex(l => l.id === layoutId)
      if (index === -1) return false

      layouts.value.splice(index, 1)

      // If we deleted the active layout, switch to another
      if (activeLayoutId.value === layoutId) {
        const next = layouts.value[0]
        _suppressAutoSave = true
        activeLayoutId.value = next.id
        dormitories.value = _deepCloneDormitories(next.dormitories)
        configName.value = next.name
        selectedDormitoryIndex.value = null
        nextTick(() => {
          _suppressAutoSave = false
        })
      }

      return true
    }

    /**
     * Import layouts from JSON data. mode = 'replace' replaces all, 'merge' adds new ones.
     */
    function importLayouts(importedLayouts: RoomLayout[], mode: 'replace' | 'merge' = 'replace') {
      if (mode === 'replace') {
        _suppressAutoSave = true
        layouts.value = importedLayouts
        // Activate the first layout
        if (importedLayouts.length > 0) {
          activeLayoutId.value = importedLayouts[0].id
          dormitories.value = _deepCloneDormitories(importedLayouts[0].dormitories)
          configName.value = importedLayouts[0].name
        }
        selectedDormitoryIndex.value = null
        nextTick(() => {
          _suppressAutoSave = false
        })
      } else {
        // Merge: add layouts that don't have duplicate names
        const existingNames = new Set(layouts.value.map(l => l.name))
        for (const layout of importedLayouts) {
          let name = layout.name
          if (existingNames.has(name)) {
            let counter = 2
            while (existingNames.has(`${layout.name} (${counter})`)) counter++
            name = `${layout.name} (${counter})`
          }
          existingNames.add(name)
          layouts.value.push({ ...layout, id: crypto.randomUUID(), name })
        }
      }
    }

    // --- Time-based Overrides + Presets ---

    /**
     * True if `date` falls within `[effectiveFrom, effectiveTo]` (inclusive
     * on both ends; `effectiveTo === null` = open-ended).
     */
    function isOverrideActiveOn(override: ConfigOverride, date: string): boolean {
      const d = parseLocalDate(date)
      if (isNaN(d.getTime())) return false
      const from = parseLocalDate(override.effectiveFrom)
      if (isNaN(from.getTime())) return false
      if (d < from) return false
      if (override.effectiveTo === null) return true
      const to = parseLocalDate(override.effectiveTo)
      if (isNaN(to.getTime())) return true
      return d <= to
    }

    /**
     * Effective config at a given date, computed by applying every
     * override active on that date to a deep clone of the base.
     *
     * Resolution order:
     *   1. Collect overrides active on this date.
     *   2. Build per-target maps keyed by (dorm name / dorm+room name / bed id),
     *      keeping only the most-recently-created override per (target, attr).
     *   3. For each dormitory → room → bed, resolve:
     *        - bed.active: explicit bed override > cascade from room > base
     *        - room.active: explicit room override > cascade from dorm > base
     *        - room.gender: explicit room gender override > base
     *        - dorm.active: explicit dorm override > base
     *   4. Bubble exceptions back up so iteration finds them:
     *        - If any bed in a room is active (e.g. via bed-level exception
     *          inside a closed room), the room is marked active.
     *        - If any room in a dorm is active, the dorm is marked active.
     *
     * Pass `date === null` to skip override resolution and return the raw
     * base tree (useful for editing the base config in Room Configuration).
     */
    const dormitoriesAt = computed(() => {
      return (date: string | null): Dormitory[] => {
        if (!date) return dormitories.value

        const active = overrides.value.filter(o => isOverrideActiveOn(o, date))
        if (active.length === 0) return dormitories.value

        // Most-recently-created wins at same target+attr level.
        const sorted = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

        const dormActive = new Map<string, boolean>()
        const roomActive = new Map<string, boolean>()
        const roomGender = new Map<string, RoomGender>()
        const bedActive = new Map<string, boolean>()

        const roomKey = (dormName: string, roomName: string) => `${dormName} ${roomName}`

        for (const o of sorted) {
          if (o.target.kind === 'dormitory' && o.change.attr === 'active') {
            if (!dormActive.has(o.target.dormitoryName)) {
              dormActive.set(o.target.dormitoryName, o.change.value)
            }
          } else if (o.target.kind === 'room' && o.change.attr === 'active') {
            const key = roomKey(o.target.dormitoryName, o.target.roomName)
            if (!roomActive.has(key)) roomActive.set(key, o.change.value)
          } else if (o.target.kind === 'room' && o.change.attr === 'gender') {
            const key = roomKey(o.target.dormitoryName, o.target.roomName)
            if (!roomGender.has(key)) roomGender.set(key, o.change.value)
          } else if (o.target.kind === 'bed' && o.change.attr === 'active') {
            if (!bedActive.has(o.target.bedId)) {
              bedActive.set(o.target.bedId, o.change.value)
            }
          }
        }

        // toRaw() unwraps Vue's reactive Proxy so structuredClone can walk the tree.
        const cloned: Dormitory[] = structuredClone(toRaw(dormitories.value))

        for (const dorm of cloned) {
          const dormSelfActive = dormActive.has(dorm.dormitoryName)
            ? dormActive.get(dorm.dormitoryName)!
            : dorm.active

          let anyRoomActive = false

          for (const room of dorm.rooms) {
            const rKey = roomKey(dorm.dormitoryName, room.roomName)

            let roomSelfActive: boolean
            if (roomActive.has(rKey)) {
              roomSelfActive = roomActive.get(rKey)!
            } else if (!dormSelfActive) {
              roomSelfActive = false
            } else {
              roomSelfActive = room.active
            }

            if (roomGender.has(rKey)) {
              room.roomGender = roomGender.get(rKey)!
            }

            let anyBedActive = false

            for (const bed of room.beds) {
              const baseBedActive = bed.active !== false
              let bedFinalActive: boolean

              if (bedActive.has(bed.bedId)) {
                bedFinalActive = bedActive.get(bed.bedId)!
              } else if (!roomSelfActive) {
                bedFinalActive = false
              } else {
                bedFinalActive = baseBedActive
              }

              bed.active = bedFinalActive
              if (bedFinalActive) anyBedActive = true
            }

            // Bed-level exception bubbles room active so iteration finds it.
            if (anyBedActive) roomSelfActive = true
            room.active = roomSelfActive
            if (roomSelfActive) anyRoomActive = true
          }

          // Room-level exception bubbles dorm active.
          dorm.active = anyRoomActive ? true : dormSelfActive
        }

        return cloned
      }
    })

    /**
     * True iff the bed exists, its room is active, and its dormitory is
     * active for **every day** in the half-open stay window
     * `[arrival, departure)`. Used by auto-placement and drop validation
     * so a candidate can't be placed on a bed that closes mid-stay.
     *
     * Missing dates = "always present" = check at "now" (today).
     */
    function isBedActiveDuringStay(
      bedId: string,
      arrival: string | null | undefined,
      departure: string | null | undefined
    ): boolean {
      // No overrides → fall through to base active state lookup.
      if (overrides.value.length === 0) {
        const bed = getBedById.value(bedId)
        if (!bed || bed.active === false) return false
        const room = getRoomByBedId.value(bedId)
        if (!room || !room.active) return false
        const dorm = getDormitoryByBedId.value(bedId)
        if (!dorm || !dorm.active) return false
        return true
      }

      // For half-open intervals, we need to check days [arrival, departure).
      // Missing/invalid dates: check just today.
      const start = arrival ? parseLocalDate(arrival) : new Date()
      const end = departure ? parseLocalDate(departure) : new Date()
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const today = new Date().toISOString().slice(0, 10)
        return isBedActiveOn(bedId, today)
      }

      // Walk each day in the half-open window. For single-day stays
      // (start === end), check that one day.
      const cursor = new Date(start)
      const stopDate = end > start ? end : new Date(start.getTime() + 86400000)
      while (cursor < stopDate) {
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        if (!isBedActiveOn(bedId, iso)) return false
        cursor.setDate(cursor.getDate() + 1)
      }
      return true
    }

    /**
     * True iff the bed (and its containing room + dorm) is active on the
     * specified date, after applying overrides.
     */
    function isBedActiveOn(bedId: string, date: string): boolean {
      const dorms = dormitoriesAt.value(date)
      for (const dorm of dorms) {
        if (!dorm.active) continue
        for (const room of dorm.rooms) {
          if (!room.active) continue
          for (const bed of room.beds) {
            if (bed.bedId === bedId) return bed.active !== false
          }
        }
      }
      return false
    }

    /**
     * Effective room gender at a given date (after overrides). Returns
     * the base gender if there's no active gender override on that day.
     */
    function roomGenderAt(dormitoryName: string, roomName: string, date: string): RoomGender | null {
      const dorms = dormitoriesAt.value(date)
      const dorm = dorms.find(d => d.dormitoryName === dormitoryName)
      if (!dorm) return null
      const room = dorm.rooms.find(r => r.roomName === roomName)
      return room?.roomGender ?? null
    }

    // --- Override CRUD ---

    /**
     * Throws on a backwards date range (`effectiveTo < effectiveFrom`)
     * since that would silently create a no-op override — typically a
     * UI-side typo rather than a meaningful state. Validates only the
     * direction; if either side is unparseable, lets it through (older
     * data with unusual date formats may still need to round-trip).
     */
    function _validateOverrideRange(from: string, to: string | null): void {
      if (to === null) return
      const fromD = parseLocalDate(from)
      const toD = parseLocalDate(to)
      if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) return
      if (toD < fromD) {
        throw new RangeError(
          `Override has effectiveTo (${to}) before effectiveFrom (${from}).`
        )
      }
    }

    function addOverride(input: {
      target: OverrideTarget
      change: OverrideAttribute
      effectiveFrom: string
      effectiveTo: string | null
      presetId?: string | null
      applicationId?: string | null
      note?: string
    }): ConfigOverride {
      _validateOverrideRange(input.effectiveFrom, input.effectiveTo)
      const override: ConfigOverride = {
        id: crypto.randomUUID(),
        target: input.target,
        change: input.change,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        presetId: input.presetId ?? null,
        applicationId: input.applicationId ?? null,
        note: input.note,
        createdAt: new Date().toISOString(),
      }
      overrides.value.push(override)
      return override
    }

    function deleteOverride(overrideId: string): boolean {
      const idx = overrides.value.findIndex(o => o.id === overrideId)
      if (idx === -1) return false
      overrides.value.splice(idx, 1)
      return true
    }

    function updateOverride(overrideId: string, updates: Partial<Omit<ConfigOverride, 'id' | 'createdAt'>>): boolean {
      const o = overrides.value.find(x => x.id === overrideId)
      if (!o) return false
      Object.assign(o, updates)
      return true
    }

    // --- Preset CRUD ---

    function addPreset(input: { name: string; description?: string; entries?: PresetTemplateEntry[] }): OverridePreset {
      const now = new Date().toISOString()
      const preset: OverridePreset = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
        entries: input.entries ?? [],
        createdAt: now,
        updatedAt: now,
      }
      presets.value.push(preset)
      return preset
    }

    function updatePreset(presetId: string, updates: Partial<Omit<OverridePreset, 'id' | 'createdAt'>>): boolean {
      const p = presets.value.find(x => x.id === presetId)
      if (!p) return false
      Object.assign(p, updates)
      p.updatedAt = new Date().toISOString()
      return true
    }

    function deletePreset(presetId: string): boolean {
      const idx = presets.value.findIndex(p => p.id === presetId)
      if (idx === -1) return false
      presets.value.splice(idx, 1)
      // Also delete every override that came from this preset (any application).
      overrides.value = overrides.value.filter(o => o.presetId !== presetId)
      return true
    }

    /**
     * Apply a preset for a given date window. Emits one override per
     * template entry, all tagged with this preset's id and a fresh
     * `applicationId` so the application can be reverted as a unit.
     *
     * Returns the `applicationId` (or null if the preset doesn't exist).
     */
    function applyPreset(
      presetId: string,
      effectiveFrom: string,
      effectiveTo: string | null,
      note?: string
    ): string | null {
      const preset = presets.value.find(p => p.id === presetId)
      if (!preset) return null
      _validateOverrideRange(effectiveFrom, effectiveTo)
      const applicationId = crypto.randomUUID()
      for (const entry of preset.entries) {
        addOverride({
          target: entry.target,
          change: entry.change,
          effectiveFrom,
          effectiveTo,
          presetId,
          applicationId,
          note,
        })
      }
      return applicationId
    }

    /**
     * Delete every override emitted by a specific preset application.
     * Returns the number of overrides removed.
     */
    function revertPresetApplication(applicationId: string): number {
      const before = overrides.value.length
      overrides.value = overrides.value.filter(o => o.applicationId !== applicationId)
      return before - overrides.value.length
    }

    // Auto-save watcher: debounced save of dormitories to active layout
    let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null

    watch(
      dormitories,
      () => {
        if (_suppressAutoSave || !activeLayoutId.value) return

        if (_autoSaveTimer) clearTimeout(_autoSaveTimer)
        _autoSaveTimer = setTimeout(() => {
          saveCurrentToActiveLayout()
        }, 500)
      },
      { deep: true }
    )

    return {
      // State
      dormitories,
      configName,
      selectedDormitoryIndex,
      bedShapeVersion,
      layouts,
      activeLayoutId,

      // Getters
      getAllRooms,
      getAllBeds,
      getBedById,
      getRoomByBedId,
      getDormitoryByBedId,
      selectedDormitory,
      activeLayout,

      // Actions
      addDormitory,
      updateDormitory,
      deleteDormitory,
      addRoom,
      updateRoom,
      deleteRoom,
      addBed,
      updateBed,
      deleteBed,
      setSelectedDormitory,
      initializeDefaultDormitories,
      importDormitories,
      migrateBedAssignments,

      // Layout actions
      ensureLayoutsInitialized,
      saveCurrentToActiveLayout,
      createLayout,
      switchLayout,
      deleteLayout,
      importLayouts,

      // Time-based overrides + presets
      overrides,
      presets,
      dormitoriesAt,
      isBedActiveDuringStay,
      isBedActiveOn,
      roomGenderAt,
      addOverride,
      deleteOverride,
      updateOverride,
      addPreset,
      updatePreset,
      deletePreset,
      applyPreset,
      revertPresetApplication,

      // Layout deprecation / migration
      layoutMigrationComplete,
    }
  },
  {
    persist: {
      key: 'dormAssignments-dormitories',
      paths: ['dormitories', 'configName', 'layouts', 'activeLayoutId', 'bedShapeVersion', 'overrides', 'presets', 'layoutMigrationComplete'],
    },
  }
)
