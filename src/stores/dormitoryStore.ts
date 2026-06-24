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
  TimelineConfiguration,
  ConfigurationTemplate,
} from '@/types'
import { DEFAULT_COLORS } from '@/types'
import { parseLocalDate } from '@/shared/composables/useUtils'
import { useBedIdGenerator } from '@/shared/composables/useBedIdGenerator'
import { useAssignmentStore } from './assignmentStore'

export interface BedIdRename {
  oldId: string
  newId: string
  roomName: string
  dormitoryName: string
}

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

    /**
     * Configuration-cuts model (`specs/ConfigurationCuts.md`).
     *
     * `configurations` is a sorted array (by `effectiveFrom` ascending,
     * `null` first). There is always exactly one configuration with
     * `effectiveFrom === null` — the initial one covering "from the
     * start of time" up to the next cut.
     *
     * `selectedConfigurationId` is the editing target: which
     * configuration the dormitory editor in Configuration tab edits.
     * Defaults to the configuration covering today.
     */
    const configurations = ref<TimelineConfiguration[]>([])
    const configurationTemplates = ref<ConfigurationTemplate[]>([])
    const selectedConfigurationId = ref<string | null>(null)
    /** Flipped true after migrating from overrides/presets to configurations. */
    const cutsModelMigrationComplete = ref<boolean>(false)

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

    // Pre-built lookup maps for O(1) bed lookups (rebuilt when dormitories change).
    //
    // INVARIANT: bed.bedId must be globally unique within `dormitories.value`.
    // Two beds with the same ID silently collapse into one Map entry, which
    // is exactly the bug that produced the "guest appears in two rooms"
    // symptom historically — see healDuplicateBedIds + the dedicated test.
    // Bed creation must go through useBedIdGenerator.generateUniqueBedId.
    // We log a console.warn here so any future regression surfaces in the
    // browser console the first time the lookup map is rebuilt, instead of
    // showing up as a UX weirdness in another tab much later.
    const bedLookupMap = computed(() => {
      const bedMap = new Map<string, Bed>()
      const roomMap = new Map<string, FlatRoom>()
      const dormMap = new Map<string, Dormitory>()
      const duplicates: Array<{ bedId: string; rooms: string[] }> = []
      const seenRooms = new Map<string, string[]>()
      for (const dormitory of dormitories.value) {
        for (const room of dormitory.rooms) {
          const flatRoom: FlatRoom = { ...room, dormitoryName: dormitory.dormitoryName }
          for (const bed of room.beds) {
            if (bedMap.has(bed.bedId)) {
              const prior = seenRooms.get(bed.bedId) ?? []
              prior.push(`${dormitory.dormitoryName} / ${room.roomName}`)
              seenRooms.set(bed.bedId, prior)
              duplicates.push({ bedId: bed.bedId, rooms: prior })
            } else {
              seenRooms.set(bed.bedId, [`${dormitory.dormitoryName} / ${room.roomName}`])
            }
            bedMap.set(bed.bedId, bed)
            roomMap.set(bed.bedId, flatRoom)
            dormMap.set(bed.bedId, dormitory)
          }
        }
      }
      if (duplicates.length > 0) {
        console.warn(
          `[dormitoryStore] Duplicate bedId(s) detected in lookup map — assignments will collide. Bed creation must use useBedIdGenerator.generateUniqueBedId; the auto-heal pass should also have caught this. Duplicates:`,
          duplicates,
        )
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

    /**
     * Renames performed by the most recent `healDuplicateBedIds()` run.
     * Surfaced in a one-time banner so the operator can verify which
     * beds were touched. Cleared once the banner is dismissed.
     */
    const bedIdHealRenames = ref<BedIdRename[]>([])

    /**
     * Dedupe `bedId` strings within each independent layout tree.
     *
     * The pre-fix `addBed()` used a 2-char room-name prefix plus the
     * local bed position with no uniqueness check, so two rooms whose
     * names shared their first two characters (e.g. "Mountain House" /
     * "Mosquito Hall" → both `MO`) produced colliding bed IDs. Because
     * `assignmentStore.guestToBed` keys by `bedId`, a colliding bed made
     * one guest appear in two rooms simultaneously.
     *
     * This routine walks every layout tree (the live `dormitories` ref,
     * each configuration's snapshot, each layout's snapshot, each
     * template's snapshot) and renames any duplicate found WITHIN a
     * given tree to a fresh unique ID via `generateUniqueBedId`. Each
     * tree is deduped independently — bed IDs are expected to be shared
     * across configurations / templates by design (same physical bed,
     * preserved through cuts) so we do not dedupe across trees.
     *
     * Returns the list of renames performed. Existing assignments stay
     * pinned to the OLD bedId, so they remain with whichever bed kept
     * the original ID; the renamed bed loses its prior (incorrectly
     * shared) assignment.
     */
    function healDuplicateBedIds(): BedIdRename[] {
      const { generateUniqueBedId } = useBedIdGenerator()
      const renames: BedIdRename[] = []

      const dedupeTree = (tree: Dormitory[] | undefined) => {
        if (!Array.isArray(tree)) return
        const seen = new Set<string>()
        for (const dorm of tree) {
          if (!Array.isArray(dorm.rooms)) continue
          for (const room of dorm.rooms) {
            if (!Array.isArray(room.beds)) continue
            for (const bed of room.beds) {
              if (!bed.bedId) continue
              if (seen.has(bed.bedId)) {
                const oldId = bed.bedId
                const newId = generateUniqueBedId(room.roomName || '', Array.from(seen))
                bed.bedId = newId
                seen.add(newId)
                renames.push({
                  oldId,
                  newId,
                  roomName: room.roomName,
                  dormitoryName: dorm.dormitoryName,
                })
              } else {
                seen.add(bed.bedId)
              }
            }
          }
        }
      }

      _suppressAutoSave = true
      dedupeTree(dormitories.value)
      for (const layout of layouts.value) {
        dedupeTree(layout.dormitories)
      }
      for (const config of configurations.value) {
        dedupeTree(config.dormitories)
      }
      for (const template of configurationTemplates.value) {
        dedupeTree(template.dormitories)
      }
      nextTick(() => {
        _suppressAutoSave = false
      })

      return renames
    }

    /**
     * One-shot heal pass mirroring the `migrateBedAssignments` watcher:
     * runs as soon as data is non-empty (after hydration or default
     * init), records any renames on `bedIdHealRenames` for the banner,
     * and disposes itself.
     */
    let _healDone = false
    const _stopHealWatch = watch(
      [dormitories, layouts, configurations, configurationTemplates],
      () => {
        if (_healDone) return
        const hasData =
          dormitories.value.length > 0 ||
          layouts.value.length > 0 ||
          configurations.value.length > 0 ||
          configurationTemplates.value.length > 0
        if (!hasData) return
        // Guard BEFORE the heal call: with flush:'sync' + deep:true,
        // renaming bedIds inside heal would otherwise re-trigger this
        // very watcher synchronously and partially overwrite the
        // rename list with a smaller second-pass result.
        _healDone = true
        const renames = healDuplicateBedIds()
        if (renames.length > 0) {
          bedIdHealRenames.value = renames
        }
        _stopHealWatch()
      },
      { immediate: true, deep: true, flush: 'sync' }
    )

    function dismissBedIdHealNotice() {
      bedIdHealRenames.value = []
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
    /**
     * Pick the configuration covering `date`. Configurations are kept
     * sorted by `effectiveFrom` (with the `null` initial config first),
     * so the covering config is the latest one whose `effectiveFrom <=
     * date`. `date === null` → today.
     */
    function configurationCovering(date: string | null): TimelineConfiguration | null {
      const list = configurations.value
      if (list.length === 0) return null
      const probe = date ?? todayIso()
      let match: TimelineConfiguration | null = null
      for (const c of list) {
        if (c.effectiveFrom === null) {
          match = c
        } else if (c.effectiveFrom <= probe) {
          match = c
        } else {
          break
        }
      }
      return match
    }

    function todayIso(): string {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const dormitoriesAt = computed(() => {
      return (date: string | null): Dormitory[] => {
        // New cuts model: each date resolves to the configuration whose
        // window covers it. Once we've migrated, configurations is the
        // sole source of truth FOR STRUCTURE. Bed assignments live in
        // assignmentStore — overlay them onto the snapshot so Table
        // View / Print views / etc. see assignments made in any
        // configuration's editing session, not just the one whose
        // editing target captured the snapshot.
        if (configurations.value.length > 0) {
          const c = configurationCovering(date)
          if (c) return _withLiveAssignments(c.dormitories)
        }

        // Pre-migration / legacy fallback to the override-resolution
        // path. Kept so the migration code itself can call
        // `dormitoriesAt(start)` on each segment boundary to snapshot.
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

    // --- Configuration Cuts (specs/ConfigurationCuts.md) ---

    /**
     * Deep clone of a dormitories tree. `structuredClone(toRaw(...))`
     * doesn't recursively unwrap Vue's nested reactive proxies — most
     * notably `bed.assignments` arrays, which throw
     * "DataCloneError: [object Array] could not be cloned" the moment
     * the operator edits one in the cuts model. `JSON.parse(JSON.stringify(...))`
     * is bulletproof for this tree shape (plain data, no Dates / fns /
     * Maps) and was the approach the layout system used in production
     * for months, so it's the safer choice here too.
     */
    function _cloneDormitories(tree: Dormitory[]): Dormitory[] {
      return JSON.parse(JSON.stringify(tree))
    }

    /**
     * Wrap a configuration snapshot so reading any `bed.assignments`
     * returns the LIVE list from assignmentStore rather than whatever
     * was baked into the snapshot.
     *
     * Why: configurations now store structural state (dorm/room/bed
     * active, gender) but bed assignments are global — they don't
     * belong to one configuration's window. Without this overlay, a
     * drag-drop on bed X in one configuration only shows up in Table
     * View when the view date falls in that same configuration; in
     * any other configuration's window the snapshot's stale
     * `assignments: []` wins and the guest visually disappears.
     *
     * Returns a freshly-cloned tree so callers can safely mutate it.
     */
    function _withLiveAssignments(tree: Dormitory[]): Dormitory[] {
      const cloned = _cloneDormitories(tree)
      const assignmentStore = useAssignmentStore()
      const bedToGuests = assignmentStore.bedToGuestsMap
      for (const dorm of cloned) {
        for (const room of dorm.rooms) {
          for (const bed of room.beds) {
            const liveGuestIds = bedToGuests.get(bed.bedId) ?? []
            bed.assignments = liveGuestIds.map(guestId => ({ guestId }))
          }
        }
      }
      return cloned
    }

    /**
     * Keep `configurations` sorted by `effectiveFrom` ascending, with
     * the null (initial) one first. Called after every mutation.
     */
    function _sortConfigurations() {
      configurations.value.sort((a, b) => {
        if (a.effectiveFrom === b.effectiveFrom) return 0
        if (a.effectiveFrom === null) return -1
        if (b.effectiveFrom === null) return 1
        return a.effectiveFrom < b.effectiveFrom ? -1 : 1
      })
    }

    interface CutOptions {
      /** Optional name; auto-numbered if omitted. */
      name?: string
      /**
       * Source for the new segment's snapshot. Default: clone the
       * configuration covering `date`. Pass another configuration id
       * to copy from elsewhere on the timeline, a templateId to
       * paste a template, or `empty: true` for a blank (no dorms)
       * starting point.
       */
      copyFrom?: string
      templateId?: string
      empty?: boolean
    }

    /**
     * Insert a cut at `date`. The new TimelineConfiguration starts at
     * that date and is a deep copy of either (a) the configuration
     * covering `date`, (b) another configuration if `copyFrom` is set,
     * or (c) a template if `templateId` is set. Returns the new
     * configuration (or null if `date` already has a cut).
     */
    function cutAt(date: string, options: CutOptions = {}): TimelineConfiguration | null {
      if (!date) return null
      const existing = configurations.value.find(c => c.effectiveFrom === date)
      if (existing) return null

      let source: Dormitory[] | null = null
      if (options.empty) {
        source = []
      } else if (options.templateId) {
        const tpl = configurationTemplates.value.find(t => t.id === options.templateId)
        if (tpl) source = _cloneDormitories(tpl.dormitories)
      } else if (options.copyFrom) {
        const src = configurations.value.find(c => c.id === options.copyFrom)
        if (src) source = _cloneDormitories(src.dormitories)
      } else {
        const covering = configurationCovering(date)
        if (covering) source = _cloneDormitories(covering.dormitories)
      }
      if (source === null) source = _cloneDormitories(dormitories.value)

      const now = new Date().toISOString()
      const config: TimelineConfiguration = {
        id: crypto.randomUUID(),
        effectiveFrom: date,
        name: options.name?.trim() || `Configuration ${configurations.value.length + 1}`,
        dormitories: source,
        createdAt: now,
        updatedAt: now,
      }
      configurations.value.push(config)
      _sortConfigurations()
      return config
    }

    /**
     * Remove a non-initial cut. The previous configuration's window
     * naturally extends to the next cut. Returns true on success,
     * false if the configuration is the initial one (refused) or
     * doesn't exist.
     */
    function deleteCut(configurationId: string): boolean {
      const idx = configurations.value.findIndex(c => c.id === configurationId)
      if (idx === -1) return false
      const target = configurations.value[idx]
      if (target.effectiveFrom === null) return false
      configurations.value.splice(idx, 1)
      // If the deleted one was selected, fall back to today's covering.
      if (selectedConfigurationId.value === configurationId) {
        const fallback = configurationCovering(null)
        selectedConfigurationId.value = fallback?.id ?? null
      }
      return true
    }

    /** Replace a configuration's snapshot with a new tree. */
    function updateConfigurationDormitories(configurationId: string, tree: Dormitory[]): boolean {
      const c = configurations.value.find(x => x.id === configurationId)
      if (!c) return false
      c.dormitories = _cloneDormitories(tree)
      c.updatedAt = new Date().toISOString()
      return true
    }

    function renameConfiguration(configurationId: string, name: string): boolean {
      const c = configurations.value.find(x => x.id === configurationId)
      if (!c) return false
      c.name = name.trim() || c.name
      c.updatedAt = new Date().toISOString()
      return true
    }

    function saveConfigurationAsTemplate(configurationId: string, name: string, description?: string): ConfigurationTemplate | null {
      const c = configurations.value.find(x => x.id === configurationId)
      if (!c) return null
      const tpl: ConfigurationTemplate = {
        id: crypto.randomUUID(),
        name: name.trim() || c.name,
        description,
        dormitories: _cloneDormitories(c.dormitories),
        createdAt: new Date().toISOString(),
      }
      configurationTemplates.value.push(tpl)
      return tpl
    }

    function deleteConfigurationTemplate(templateId: string): boolean {
      const idx = configurationTemplates.value.findIndex(t => t.id === templateId)
      if (idx === -1) return false
      configurationTemplates.value.splice(idx, 1)
      return true
    }

    function renameConfigurationTemplate(templateId: string, name: string): boolean {
      const t = configurationTemplates.value.find(x => x.id === templateId)
      if (!t) return false
      t.name = name.trim() || t.name
      return true
    }

    /**
     * The configuration whose window covers today. Read-only helper —
     * Configuration tab uses this as the default editing target.
     */
    const currentConfiguration = computed<TimelineConfiguration | null>(() => {
      return configurationCovering(null)
    })

    /**
     * The half-open window `[start, endExclusive)` a configuration
     * covers, in ISO `YYYY-MM-DD` strings. `start` is null for the
     * initial configuration ("from the start of time"); `endExclusive`
     * is null when the configuration is the last one ("runs forever
     * forward"). Used by edit-time guards (e.g. "is this guest in the
     * window of the configuration I'm editing?") so we only warn about
     * guests actually affected by a per-segment change.
     */
    function configurationWindow(configurationId: string): { start: string | null; endExclusive: string | null } | null {
      const sorted = [...configurations.value].sort((a, b) => {
        if (a.effectiveFrom === b.effectiveFrom) return 0
        if (a.effectiveFrom === null) return -1
        if (b.effectiveFrom === null) return 1
        return a.effectiveFrom < b.effectiveFrom ? -1 : 1
      })
      const idx = sorted.findIndex(c => c.id === configurationId)
      if (idx === -1) return null
      return {
        start: sorted[idx].effectiveFrom,
        endExclusive: sorted[idx + 1]?.effectiveFrom ?? null,
      }
    }

    /**
     * Collect every bedId present in any configuration's dormitory tree
     * EXCEPT the one identified by `excludeConfigurationId`. Used by the
     * structural-remove handlers (remove bed/room/dormitory) to decide
     * whether a removal in the currently-edited cut truly nukes a bedId
     * everywhere (→ unassign affected guests) or merely scopes it out of
     * this cut (→ leave assignments alone; the date-overlap validation
     * will surface the warning the same way it does for deactivation).
     */
    function getBedIdsInOtherConfigurations(excludeConfigurationId: string | null): Set<string> {
      const ids = new Set<string>()
      for (const c of configurations.value) {
        if (c.id === excludeConfigurationId) continue
        for (const d of c.dormitories) {
          for (const r of d.rooms) {
            for (const b of r.beds) {
              ids.add(b.bedId)
            }
          }
        }
      }
      return ids
    }

    /** Set the editing target by id. No-op if id is unknown. */
    function selectConfiguration(configurationId: string | null) {
      if (configurationId === null) {
        selectedConfigurationId.value = null
        return
      }
      if (configurations.value.find(c => c.id === configurationId)) {
        selectedConfigurationId.value = configurationId
      }
    }

    /**
     * One-way migration from the override / preset model
     * (TimeBasedRoomConfig spec) to the cuts model
     * (ConfigurationCuts spec). Idempotent — runs once, marked complete.
     *
     * Steps:
     *   1. Compute the segment boundaries from existing overrides.
     *   2. For each segment, snapshot the effective config at the
     *      segment's start via the legacy `dormitoriesAt`.
     *   3. The "earliest" segment becomes the initial configuration
     *      (`effectiveFrom: null`).
     *   4. Each preset becomes a ConfigurationTemplate (snapshot of base
     *      after applying that preset's entries).
     *   5. Clear `overrides` and `presets`; flip the migration flag.
     *
     * If `configurations` is already non-empty, this just flips the
     * flag without touching anything. If both `overrides` and `presets`
     * are empty, a single initial configuration is created from the
     * current `dormitories` tree.
     */
    function migrateToCutsModel() {
      if (cutsModelMigrationComplete.value) return
      if (configurations.value.length > 0) {
        cutsModelMigrationComplete.value = true
        return
      }

      // Collect all override boundary dates.
      const boundarySet = new Set<string>()
      for (const o of overrides.value) {
        boundarySet.add(o.effectiveFrom)
        if (o.effectiveTo !== null) {
          // The day AFTER effectiveTo is when the override flips off.
          const d = parseLocalDate(o.effectiveTo)
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 1)
            boundarySet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
          }
        }
      }
      const boundaries = [...boundarySet].sort()
      const now = new Date().toISOString()

      // First configuration: effectiveFrom = null = initial.
      const initial: TimelineConfiguration = {
        id: crypto.randomUUID(),
        effectiveFrom: null,
        name: 'Default',
        // Snapshot the "before any overrides" state = the raw base.
        dormitories: _cloneDormitories(dormitories.value),
        createdAt: now,
        updatedAt: now,
      }
      configurations.value.push(initial)

      // For each boundary, snapshot the effective config at that date.
      for (let i = 0; i < boundaries.length; i++) {
        const start = boundaries[i]
        // _resolveLegacy uses the OLD override path because configurations
        // is non-empty by now and dormitoriesAt would short-circuit.
        const snapshot = _resolveLegacyDormitoriesAt(start)
        // Name from the preset that fully covers this segment, if any.
        const activeAtStart = overrides.value.filter(o => isOverrideActiveOn(o, start))
        let name = `Configuration ${i + 2}`
        const presetCounts = new Map<string, number>()
        for (const o of activeAtStart) {
          if (o.presetId) {
            presetCounts.set(o.presetId, (presetCounts.get(o.presetId) ?? 0) + 1)
          }
        }
        if (presetCounts.size === 1) {
          const onlyId = [...presetCounts.keys()][0]
          const preset = presets.value.find(p => p.id === onlyId)
          if (preset) name = preset.name
        } else if (presetCounts.size === 0 && activeAtStart.length === 0) {
          name = 'Default'
        }
        configurations.value.push({
          id: crypto.randomUUID(),
          effectiveFrom: start,
          name,
          dormitories: snapshot,
          createdAt: now,
          updatedAt: now,
        })
      }

      // Each preset → ConfigurationTemplate. Apply the preset's entries
      // to the base in-memory and snapshot the result.
      for (const preset of presets.value) {
        const synthetic: ConfigOverride[] = preset.entries.map((e, idx) => ({
          id: `_migrate_${preset.id}_${idx}`,
          target: e.target,
          change: e.change,
          effectiveFrom: '1900-01-01',
          effectiveTo: null,
          presetId: preset.id,
          applicationId: null,
          createdAt: now,
        }))
        const baseDorms = _cloneDormitories(dormitories.value)
        const snapshot = _applyOverridesToTree(baseDorms, synthetic, '1900-01-02')
        configurationTemplates.value.push({
          id: crypto.randomUUID(),
          name: preset.name,
          description: preset.description,
          dormitories: snapshot,
          createdAt: now,
        })
      }

      _sortConfigurations()
      // Default editing target = today's covering config.
      selectedConfigurationId.value = configurationCovering(null)?.id ?? initial.id

      // Clear legacy state (kept in the persisted schema for one release
      // for rollback; emptied here to prevent double-counting).
      overrides.value = []
      presets.value = []
      cutsModelMigrationComplete.value = true
    }

    /** Same logic as `dormitoriesAt` was before the cuts-model branch. */
    function _resolveLegacyDormitoriesAt(date: string): Dormitory[] {
      const active = overrides.value.filter(o => isOverrideActiveOn(o, date))
      if (active.length === 0) return _cloneDormitories(dormitories.value)
      return _applyOverridesToTree(_cloneDormitories(dormitories.value), active, date)
    }

    /** Lifted from the original cascade logic so the migration can reuse it. */
    function _applyOverridesToTree(tree: Dormitory[], active: ConfigOverride[], _date: string): Dormitory[] {
      const sorted = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const dormActiveMap = new Map<string, boolean>()
      const roomActiveMap = new Map<string, boolean>()
      const roomGenderMap = new Map<string, RoomGender>()
      const bedActiveMap = new Map<string, boolean>()
      const roomKey = (d: string, r: string) => `${d} ${r}`
      for (const o of sorted) {
        if (o.target.kind === 'dormitory' && o.change.attr === 'active') {
          if (!dormActiveMap.has(o.target.dormitoryName)) dormActiveMap.set(o.target.dormitoryName, o.change.value)
        } else if (o.target.kind === 'room' && o.change.attr === 'active') {
          const k = roomKey(o.target.dormitoryName, o.target.roomName)
          if (!roomActiveMap.has(k)) roomActiveMap.set(k, o.change.value)
        } else if (o.target.kind === 'room' && o.change.attr === 'gender') {
          const k = roomKey(o.target.dormitoryName, o.target.roomName)
          if (!roomGenderMap.has(k)) roomGenderMap.set(k, o.change.value)
        } else if (o.target.kind === 'bed' && o.change.attr === 'active') {
          if (!bedActiveMap.has(o.target.bedId)) bedActiveMap.set(o.target.bedId, o.change.value)
        }
      }
      for (const dorm of tree) {
        const dormSelfActive = dormActiveMap.has(dorm.dormitoryName) ? dormActiveMap.get(dorm.dormitoryName)! : dorm.active
        let anyRoomActive = false
        for (const room of dorm.rooms) {
          const k = roomKey(dorm.dormitoryName, room.roomName)
          let roomSelfActive: boolean
          if (roomActiveMap.has(k)) roomSelfActive = roomActiveMap.get(k)!
          else if (!dormSelfActive) roomSelfActive = false
          else roomSelfActive = room.active
          if (roomGenderMap.has(k)) room.roomGender = roomGenderMap.get(k)!
          let anyBedActive = false
          for (const bed of room.beds) {
            const baseBed = bed.active !== false
            let bedFinal: boolean
            if (bedActiveMap.has(bed.bedId)) bedFinal = bedActiveMap.get(bed.bedId)!
            else if (!roomSelfActive) bedFinal = false
            else bedFinal = baseBed
            bed.active = bedFinal
            if (bedFinal) anyBedActive = true
          }
          if (anyBedActive) roomSelfActive = true
          room.active = roomSelfActive
          if (roomSelfActive) anyRoomActive = true
        }
        dorm.active = anyRoomActive ? true : dormSelfActive
      }
      return tree
    }

    // --- Editing-target syncing ---

    /**
     * Both the load-on-switch watcher and the debounced auto-save share
     * a single pending timer + target id. The id is captured at edit
     * time so a fast switch can't make the timer write into the wrong
     * configuration. When the operator switches configurations, any
     * pending save is FLUSHED synchronously to the old target first,
     * then the new target's snapshot is loaded.
     */
    let _cutsAutoSaveTimer: ReturnType<typeof setTimeout> | null = null
    let _cutsAutoSaveTargetId: string | null = null

    function _flushPendingConfigSave() {
      if (!_cutsAutoSaveTimer || !_cutsAutoSaveTargetId) return
      clearTimeout(_cutsAutoSaveTimer)
      _cutsAutoSaveTimer = null
      const target = configurations.value.find(x => x.id === _cutsAutoSaveTargetId)
      _cutsAutoSaveTargetId = null
      if (!target) return
      target.dormitories = _cloneDormitories(dormitories.value)
      target.updatedAt = new Date().toISOString()
    }

    /**
     * When the editing target changes, flush any pending save to the
     * OLD target, then load the new target's snapshot. Suppress the
     * autosave watcher during the load so the swap doesn't immediately
     * write back.
     */
    watch(selectedConfigurationId, (newId, oldId) => {
      // Pending edits to the previous configuration must land BEFORE we
      // overwrite the working `dormitories` ref with the new snapshot.
      if (oldId && _cutsAutoSaveTargetId === oldId) {
        _flushPendingConfigSave()
      }
      if (!newId) return
      const c = configurations.value.find(x => x.id === newId)
      if (!c) return
      _suppressAutoSave = true
      dormitories.value = _cloneDormitories(c.dormitories)
      nextTick(() => { _suppressAutoSave = false })
    })

    /**
     * Auto-save the working `dormitories` ref back to the selected
     * configuration's snapshot. Debounced so a flurry of edits collapses
     * into a single write. Captures the target id at trigger time so a
     * mid-debounce switch can be flushed to the right target rather
     * than overwriting the new selection.
     */
    watch(
      dormitories,
      () => {
        if (_suppressAutoSave) return
        if (configurations.value.length === 0) return
        const targetId = selectedConfigurationId.value
        if (!targetId) return
        if (_cutsAutoSaveTimer) clearTimeout(_cutsAutoSaveTimer)
        _cutsAutoSaveTargetId = targetId
        _cutsAutoSaveTimer = setTimeout(() => {
          const c = configurations.value.find(x => x.id === targetId)
          _cutsAutoSaveTimer = null
          _cutsAutoSaveTargetId = null
          if (!c) return
          c.dormitories = _cloneDormitories(dormitories.value)
          c.updatedAt = new Date().toISOString()
        }, 500)
      },
      { deep: true }
    )

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
      healDuplicateBedIds,
      bedIdHealRenames,
      dismissBedIdHealNotice,

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

      // Configuration cuts model
      configurations,
      configurationTemplates,
      selectedConfigurationId,
      cutsModelMigrationComplete,
      currentConfiguration,
      configurationCovering,
      configurationWindow,
      getBedIdsInOtherConfigurations,
      cutAt,
      deleteCut,
      updateConfigurationDormitories,
      renameConfiguration,
      saveConfigurationAsTemplate,
      deleteConfigurationTemplate,
      renameConfigurationTemplate,
      selectConfiguration,
      migrateToCutsModel,
    }
  },
  {
    persist: {
      key: 'dormAssignments-dormitories',
      paths: [
        'dormitories',
        'configName',
        'layouts',
        'activeLayoutId',
        'bedShapeVersion',
        'overrides',
        'presets',
        'layoutMigrationComplete',
        'configurations',
        'configurationTemplates',
        'selectedConfigurationId',
        'cutsModelMigrationComplete',
        'bedIdHealRenames',
      ],
    },
  }
)
