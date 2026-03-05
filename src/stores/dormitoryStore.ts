/**
 * Dormitory Store
 * Manages dormitories, rooms, beds, and room layout presets
 */

import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import type { Dormitory, DormitoryInput, Room, RoomInput, Bed, FlatRoom, RoomLayout } from '@/types'
import { DEFAULT_COLORS } from '@/types'

export const useDormitoryStore = defineStore(
  'dormitories',
  () => {
    // State
    const dormitories = ref<Dormitory[]>([])
    const configName = ref<string>('')
    const selectedDormitoryIndex = ref<number | null>(null)

    // Layout state
    const layouts = ref<RoomLayout[]>([])
    const activeLayoutId = ref<string | null>(null)

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
                { bedId: 'MA1', bedType: 'lower', assignedGuestId: null, position: 1 },
                { bedId: 'MA2', bedType: 'upper', assignedGuestId: null, position: 2 },
                { bedId: 'MA3', bedType: 'lower', assignedGuestId: null, position: 3 },
                { bedId: 'MA4', bedType: 'upper', assignedGuestId: null, position: 4 },
                { bedId: 'MA5', bedType: 'single', assignedGuestId: null, position: 5 },
                { bedId: 'MA6', bedType: 'single', assignedGuestId: null, position: 6 },
              ],
            },
            {
              roomName: "Men's Dorm B",
              roomGender: 'M',
              active: true,
              beds: [
                { bedId: 'MB1', bedType: 'lower', assignedGuestId: null, position: 1 },
                { bedId: 'MB2', bedType: 'upper', assignedGuestId: null, position: 2 },
                { bedId: 'MB3', bedType: 'lower', assignedGuestId: null, position: 3 },
                { bedId: 'MB4', bedType: 'upper', assignedGuestId: null, position: 4 },
              ],
            },
            {
              roomName: "Women's Dorm A",
              roomGender: 'F',
              active: true,
              beds: [
                { bedId: 'WA1', bedType: 'lower', assignedGuestId: null, position: 1 },
                { bedId: 'WA2', bedType: 'upper', assignedGuestId: null, position: 2 },
                { bedId: 'WA3', bedType: 'lower', assignedGuestId: null, position: 3 },
                { bedId: 'WA4', bedType: 'upper', assignedGuestId: null, position: 4 },
                { bedId: 'WA5', bedType: 'single', assignedGuestId: null, position: 5 },
                { bedId: 'WA6', bedType: 'single', assignedGuestId: null, position: 6 },
              ],
            },
            {
              roomName: "Women's Dorm B",
              roomGender: 'F',
              active: true,
              beds: [
                { bedId: 'WB1', bedType: 'lower', assignedGuestId: null, position: 1 },
                { bedId: 'WB2', bedType: 'upper', assignedGuestId: null, position: 2 },
                { bedId: 'WB3', bedType: 'lower', assignedGuestId: null, position: 3 },
                { bedId: 'WB4', bedType: 'upper', assignedGuestId: null, position: 4 },
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
                { bedId: 'FR1', bedType: 'single', assignedGuestId: null, position: 1 },
                { bedId: 'FR2', bedType: 'single', assignedGuestId: null, position: 2 },
                { bedId: 'FR3', bedType: 'single', assignedGuestId: null, position: 3 },
                { bedId: 'FR4', bedType: 'single', assignedGuestId: null, position: 4 },
              ],
            },
          ],
        },
      ]
    }

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

      // Layout actions
      ensureLayoutsInitialized,
      saveCurrentToActiveLayout,
      createLayout,
      switchLayout,
      deleteLayout,
      importLayouts,
    }
  },
  {
    persist: {
      key: 'dormAssignments-dormitories',
      paths: ['dormitories', 'configName', 'layouts', 'activeLayoutId'],
    },
  }
)
