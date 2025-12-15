/**
 * Tests for Data Backup Composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataBackup, type BackupData, type ImportValidationResult } from './useDataBackup'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { DATA_VERSION } from '@/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Polyfill File.text() for jsdom
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = function(): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}

describe('useDataBackup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  describe('createBackup', () => {
    it('creates a backup with correct structure', () => {
      const { createBackup } = useDataBackup()
      const backup = createBackup()

      expect(backup).toHaveProperty('version')
      expect(backup).toHaveProperty('exportedAt')
      expect(backup).toHaveProperty('data')
      expect(backup.data).toHaveProperty('guests')
      expect(backup.data).toHaveProperty('dormitories')
      expect(backup.data).toHaveProperty('assignments')
      expect(backup.data).toHaveProperty('assignmentHistory')
      expect(backup.data).toHaveProperty('settings')
      expect(backup.data).toHaveProperty('timeline')
    })

    it('includes correct version', () => {
      const { createBackup } = useDataBackup()
      const backup = createBackup()

      expect(backup.version).toBe(DATA_VERSION)
    })

    it('includes timestamp', () => {
      const { createBackup } = useDataBackup()
      const before = new Date().toISOString()
      const backup = createBackup()
      const after = new Date().toISOString()

      expect(backup.exportedAt >= before).toBe(true)
      expect(backup.exportedAt <= after).toBe(true)
    })

    it('exports guests from store', () => {
      const guestStore = useGuestStore()
      guestStore.addGuest({
        firstName: 'Test',
        lastName: 'Guest',
        gender: 'M',
        age: 30,
      })

      const { createBackup } = useDataBackup()
      const backup = createBackup()

      expect(backup.data.guests).toHaveLength(1)
      expect(backup.data.guests[0].firstName).toBe('Test')
      expect(backup.data.guests[0].lastName).toBe('Guest')
    })

    it('exports dormitories from store', () => {
      const dormitoryStore = useDormitoryStore()
      dormitoryStore.addDormitory({ dormitoryName: 'Test Dorm' })

      const { createBackup } = useDataBackup()
      const backup = createBackup()

      expect(backup.data.dormitories).toHaveLength(1)
      expect(backup.data.dormitories[0].dormitoryName).toBe('Test Dorm')
    })

    it('exports assignments as array', () => {
      const guestStore = useGuestStore()
      const dormitoryStore = useDormitoryStore()
      const assignmentStore = useAssignmentStore()

      // Add guest
      guestStore.addGuest({
        firstName: 'Test',
        lastName: 'Guest',
        gender: 'M',
        age: 30,
      })
      const guestId = guestStore.guests[0].id

      // Add dormitory with room and bed
      dormitoryStore.addDormitory({ dormitoryName: 'Test Dorm' })
      dormitoryStore.addRoom(0, {
        roomName: 'Test Room',
        roomGender: 'M',
        active: true,
        beds: [{ bedId: 'TR01', bedType: 'single', position: 1, assignedGuestId: null }],
      })

      // Assign guest to bed
      assignmentStore.assignGuestToBed(guestId, 'TR01')

      const { createBackup } = useDataBackup()
      const backup = createBackup()

      expect(Array.isArray(backup.data.assignments)).toBe(true)
      expect(backup.data.assignments).toHaveLength(1)
      expect(backup.data.assignments[0]).toEqual([guestId, 'TR01'])
    })
  })

  describe('validateBackup', () => {
    it('returns invalid for non-object data', () => {
      const { validateBackup } = useDataBackup()

      expect(validateBackup(null).isValid).toBe(false)
      expect(validateBackup('string').isValid).toBe(false)
      expect(validateBackup(123).isValid).toBe(false)
    })

    it('returns invalid for missing data object', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({ version: '2.0' })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid backup file: missing data object')
    })

    it('returns invalid for non-array guests', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        version: '2.0',
        data: {
          guests: 'not an array',
          dormitories: [],
        },
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid backup file: guests must be an array')
    })

    it('returns invalid for non-array dormitories', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        version: '2.0',
        data: {
          guests: [],
          dormitories: 'not an array',
        },
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid backup file: dormitories must be an array')
    })

    it('returns warning for missing version', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        data: {
          guests: [],
          dormitories: [],
        },
      })

      expect(result.warnings).toContain('No version field found, assuming current version')
    })

    it('returns warning for version mismatch', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        version: '1.0',
        data: {
          guests: [],
          dormitories: [],
        },
      })

      expect(result.warnings.some(w => w.includes('differs from current version'))).toBe(true)
    })

    it('returns valid for correct backup structure', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          guests: [{ id: 'g1', firstName: 'Test', lastName: 'Guest', gender: 'M', age: 30 }],
          dormitories: [
            {
              dormitoryName: 'Test Dorm',
              active: true,
              rooms: [
                {
                  roomName: 'Test Room',
                  roomGender: 'M',
                  active: true,
                  beds: [{ bedId: 'TR01', bedType: 'single', position: 1, assignedGuestId: null }],
                },
              ],
            },
          ],
          assignments: [['g1', 'TR01']],
          assignmentHistory: [],
          settings: {},
          timeline: {},
        },
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('calculates correct summary counts', () => {
      const { validateBackup } = useDataBackup()
      const result = validateBackup({
        version: DATA_VERSION,
        data: {
          guests: [
            { id: 'g1', firstName: 'A', lastName: 'A', gender: 'M', age: 30 },
            { id: 'g2', firstName: 'B', lastName: 'B', gender: 'F', age: 25 },
          ],
          dormitories: [
            {
              dormitoryName: 'Dorm 1',
              active: true,
              rooms: [
                {
                  roomName: 'Room 1',
                  roomGender: 'M',
                  active: true,
                  beds: [
                    { bedId: 'R1B1', bedType: 'single', position: 1 },
                    { bedId: 'R1B2', bedType: 'single', position: 2 },
                  ],
                },
                {
                  roomName: 'Room 2',
                  roomGender: 'F',
                  active: true,
                  beds: [{ bedId: 'R2B1', bedType: 'single', position: 1 }],
                },
              ],
            },
          ],
          assignments: [['g1', 'R1B1']],
        },
      })

      expect(result.summary.guestCount).toBe(2)
      expect(result.summary.dormitoryCount).toBe(1)
      expect(result.summary.roomCount).toBe(2)
      expect(result.summary.bedCount).toBe(3)
      expect(result.summary.assignmentCount).toBe(1)
    })
  })

  describe('generateBackupFilename', () => {
    it('generates filename with date and time', () => {
      const { generateBackupFilename } = useDataBackup()
      const filename = generateBackupFilename()

      expect(filename).toMatch(/^dorm-assignment-backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/)
    })
  })

  describe('importBackup', () => {
    it('returns error for invalid JSON file', async () => {
      const { importBackup } = useDataBackup()
      const file = new File(['not valid json'], 'backup.json', { type: 'application/json' })

      const result = await importBackup(file)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('returns error for invalid backup structure', async () => {
      const { importBackup } = useDataBackup()
      const file = new File(['{"invalid": true}'], 'backup.json', { type: 'application/json' })

      const result = await importBackup(file)

      expect(result.isValid).toBe(false)
    })

    it('imports valid backup successfully', async () => {
      const backup: BackupData = {
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          guests: [{ id: 'g1', firstName: 'Test', lastName: 'Guest', gender: 'M', age: 30 }],
          dormitories: [
            {
              dormitoryName: 'Test Dorm',
              active: true,
              rooms: [],
            },
          ],
          assignments: [],
          assignmentHistory: [],
          settings: {
            warnings: { genderMismatch: true, bunkPreference: true, familySeparation: true, roomAvailability: true },
            display: { showAgeHistograms: true },
            autoPlacement: { enabled: true, priorities: [], allowConstraintRelaxation: true },
            version: '1.0',
          },
          timeline: {
            dateRangeStart: new Date().toISOString(),
            dateRangeEnd: new Date().toISOString(),
            collapsedDorms: [],
            showUnassignedPanel: false,
            columnWidth: 50,
          },
        },
      }

      const { importBackup } = useDataBackup()
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })

      const result = await importBackup(file)

      expect(result.isValid).toBe(true)
      expect(result.summary.guestCount).toBe(1)
      expect(result.summary.dormitoryCount).toBe(1)

      // Verify stores were updated
      const guestStore = useGuestStore()
      const dormitoryStore = useDormitoryStore()

      expect(guestStore.guests).toHaveLength(1)
      expect(guestStore.guests[0].firstName).toBe('Test')
      expect(dormitoryStore.dormitories).toHaveLength(1)
      expect(dormitoryStore.dormitories[0].dormitoryName).toBe('Test Dorm')
    })

    it('restores assignments correctly', async () => {
      const backup: BackupData = {
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          guests: [{ id: 'guest-1', firstName: 'Test', lastName: 'Guest', gender: 'M', age: 30 }],
          dormitories: [
            {
              dormitoryName: 'Test Dorm',
              active: true,
              rooms: [
                {
                  roomName: 'Test Room',
                  roomGender: 'M',
                  active: true,
                  beds: [{ bedId: 'TR01', bedType: 'single', position: 1, assignedGuestId: null }],
                },
              ],
            },
          ],
          assignments: [['guest-1', 'TR01']],
          assignmentHistory: [],
          settings: {
            warnings: { genderMismatch: true, bunkPreference: true, familySeparation: true, roomAvailability: true },
            display: { showAgeHistograms: true },
            autoPlacement: { enabled: true, priorities: [], allowConstraintRelaxation: true },
            version: '1.0',
          },
          timeline: {
            dateRangeStart: new Date().toISOString(),
            dateRangeEnd: new Date().toISOString(),
            collapsedDorms: [],
            showUnassignedPanel: false,
            columnWidth: 50,
          },
        },
      }

      const { importBackup } = useDataBackup()
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })

      await importBackup(file)

      const assignmentStore = useAssignmentStore()
      expect(assignmentStore.assignments.get('guest-1')).toBe('TR01')
    })
  })

  describe('round-trip export/import', () => {
    it('preserves data through export and import cycle', async () => {
      // Set up initial data
      const guestStore = useGuestStore()
      const dormitoryStore = useDormitoryStore()
      const assignmentStore = useAssignmentStore()

      guestStore.addGuest({
        firstName: 'Round',
        lastName: 'Trip',
        gender: 'F',
        age: 25,
        groupName: 'Test Group',
      })
      const guestId = guestStore.guests[0].id

      dormitoryStore.addDormitory({ dormitoryName: 'Round Trip Dorm' })
      dormitoryStore.addRoom(0, {
        roomName: 'RT Room',
        roomGender: 'F',
        active: true,
        beds: [{ bedId: 'RTR01', bedType: 'lower', position: 1, assignedGuestId: null }],
      })

      assignmentStore.assignGuestToBed(guestId, 'RTR01')

      // Export
      const { createBackup, importBackup } = useDataBackup()
      const backup = createBackup()
      const backupJson = JSON.stringify(backup)

      // Clear all data
      guestStore.clearAllGuests()
      dormitoryStore.importDormitories([])
      assignmentStore.clearAllAssignments()

      // Verify data is cleared
      expect(guestStore.guests).toHaveLength(0)
      expect(dormitoryStore.dormitories).toHaveLength(0)

      // Import
      const file = new File([backupJson], 'backup.json', { type: 'application/json' })
      const result = await importBackup(file)

      expect(result.isValid).toBe(true)

      // Verify data is restored
      expect(guestStore.guests).toHaveLength(1)
      expect(guestStore.guests[0].firstName).toBe('Round')
      expect(guestStore.guests[0].lastName).toBe('Trip')
      expect(guestStore.guests[0].groupName).toBe('Test Group')

      expect(dormitoryStore.dormitories).toHaveLength(1)
      expect(dormitoryStore.dormitories[0].dormitoryName).toBe('Round Trip Dorm')
      expect(dormitoryStore.dormitories[0].rooms).toHaveLength(1)
      expect(dormitoryStore.dormitories[0].rooms[0].beds).toHaveLength(1)
    })
  })
})
