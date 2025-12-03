/**
 * Dormitory Store
 * Manages dormitories, rooms, and beds
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Dormitory, DormitoryInput, Room, RoomInput, Bed, FlatRoom } from '@/types'
import { DEFAULT_COLORS } from '@/types'

export const useDormitoryStore = defineStore(
  'dormitories',
  () => {
    // State
    const dormitories = ref<Dormitory[]>([])
    const selectedDormitoryIndex = ref<number | null>(null)

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

    const getBedById = computed(() => {
      return (bedId: string): Bed | undefined => {
        for (const dormitory of dormitories.value) {
          for (const room of dormitory.rooms) {
            const bed = room.beds.find(b => b.bedId === bedId)
            if (bed) return bed
          }
        }
        return undefined
      }
    })

    const getRoomByBedId = computed(() => {
      return (bedId: string): FlatRoom | undefined => {
        for (const dormitory of dormitories.value) {
          for (const room of dormitory.rooms) {
            if (room.beds.some(b => b.bedId === bedId)) {
              return {
                ...room,
                dormitoryName: dormitory.dormitoryName,
              }
            }
          }
        }
        return undefined
      }
    })

    const getDormitoryByBedId = computed(() => {
      return (bedId: string): Dormitory | undefined => {
        for (const dormitory of dormitories.value) {
          for (const room of dormitory.rooms) {
            if (room.beds.some(b => b.bedId === bedId)) {
              return dormitory
            }
          }
        }
        return undefined
      }
    })

    const selectedDormitory = computed(() => {
      if (selectedDormitoryIndex.value !== null && selectedDormitoryIndex.value >= 0) {
        return dormitories.value[selectedDormitoryIndex.value]
      }
      return null
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

    return {
      // State
      dormitories,
      selectedDormitoryIndex,

      // Getters
      getAllRooms,
      getAllBeds,
      getBedById,
      getRoomByBedId,
      getDormitoryByBedId,
      selectedDormitory,

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
    }
  },
  {
    persist: {
      key: 'dormAssignments-dormitories',
      paths: ['dormitories'],
    },
  }
)
