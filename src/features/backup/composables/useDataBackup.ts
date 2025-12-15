/**
 * Data Backup Composable
 * Provides full application data export and import functionality
 */

import { ref } from 'vue'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { DATA_VERSION } from '@/types'
import type { Guest, Dormitory, Settings, AssignmentEntry, SerializedHistoryState } from '@/types'

/**
 * Full backup data structure
 */
export interface BackupData {
  version: string
  exportedAt: string
  data: {
    guests: Guest[]
    dormitories: Dormitory[]
    assignments: AssignmentEntry[]
    assignmentHistory: SerializedHistoryState[]
    settings: Settings
    timeline: {
      dateRangeStart: string
      dateRangeEnd: string
      collapsedDorms: string[]
      showUnassignedPanel: boolean
      columnWidth: number
    }
  }
}

/**
 * Result of import validation
 */
export interface ImportValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    guestCount: number
    dormitoryCount: number
    roomCount: number
    bedCount: number
    assignmentCount: number
  }
}

export function useDataBackup() {
  const isExporting = ref(false)
  const isImporting = ref(false)
  const lastError = ref<string | null>(null)

  const guestStore = useGuestStore()
  const dormitoryStore = useDormitoryStore()
  const assignmentStore = useAssignmentStore()
  const settingsStore = useSettingsStore()
  const timelineStore = useTimelineStore()

  /**
   * Creates a full backup of all application data
   */
  function createBackup(): BackupData {
    // Convert assignments Map to array
    const assignmentsArray: AssignmentEntry[] = Array.from(assignmentStore.assignments.entries())

    // Serialize assignment history
    const historyArray: SerializedHistoryState[] = assignmentStore.assignmentHistory.map(state => ({
      assignments: Array.from(state.assignments.entries()),
      timestamp: state.timestamp,
    }))

    return {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        guests: guestStore.guests,
        dormitories: dormitoryStore.dormitories,
        assignments: assignmentsArray,
        assignmentHistory: historyArray,
        settings: settingsStore.settings,
        timeline: {
          dateRangeStart: timelineStore.config.dateRangeStart.toISOString(),
          dateRangeEnd: timelineStore.config.dateRangeEnd.toISOString(),
          collapsedDorms: timelineStore.config.collapsedDorms,
          showUnassignedPanel: timelineStore.config.showUnassignedPanel,
          columnWidth: timelineStore.columnWidth,
        },
      },
    }
  }

  /**
   * Exports backup data as a JSON file download
   */
  function exportBackup(): void {
    isExporting.value = true
    lastError.value = null

    try {
      const backup = createBackup()
      const jsonString = JSON.stringify(backup, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      const filename = generateBackupFilename()
      downloadFile(blob, filename)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Failed to export backup'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Validates backup data before import
   */
  function validateBackup(data: unknown): ImportValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let summary = {
      guestCount: 0,
      dormitoryCount: 0,
      roomCount: 0,
      bedCount: 0,
      assignmentCount: 0,
    }

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push('Invalid backup file: not a valid JSON object')
      return { isValid: false, errors, warnings, summary }
    }

    const backup = data as Record<string, unknown>

    // Check version
    if (!backup.version) {
      warnings.push('No version field found, assuming current version')
    } else if (backup.version !== DATA_VERSION) {
      warnings.push(`Backup version ${backup.version} differs from current version ${DATA_VERSION}`)
    }

    // Check data object
    if (!backup.data || typeof backup.data !== 'object') {
      errors.push('Invalid backup file: missing data object')
      return { isValid: false, errors, warnings, summary }
    }

    const backupData = backup.data as Record<string, unknown>

    // Validate guests
    if (!Array.isArray(backupData.guests)) {
      errors.push('Invalid backup file: guests must be an array')
    } else {
      summary.guestCount = backupData.guests.length
      // Validate guest structure
      const invalidGuests = backupData.guests.filter(
        (g: unknown) => !g || typeof g !== 'object' || !('id' in (g as object))
      )
      if (invalidGuests.length > 0) {
        errors.push(`Found ${invalidGuests.length} invalid guest entries`)
      }
    }

    // Validate dormitories
    if (!Array.isArray(backupData.dormitories)) {
      errors.push('Invalid backup file: dormitories must be an array')
    } else {
      summary.dormitoryCount = backupData.dormitories.length
      backupData.dormitories.forEach((dorm: unknown) => {
        if (dorm && typeof dorm === 'object' && 'rooms' in (dorm as object)) {
          const rooms = (dorm as { rooms: unknown[] }).rooms
          if (Array.isArray(rooms)) {
            summary.roomCount += rooms.length
            rooms.forEach((room: unknown) => {
              if (room && typeof room === 'object' && 'beds' in (room as object)) {
                const beds = (room as { beds: unknown[] }).beds
                if (Array.isArray(beds)) {
                  summary.bedCount += beds.length
                }
              }
            })
          }
        }
      })
    }

    // Validate assignments
    if (!Array.isArray(backupData.assignments)) {
      warnings.push('No assignments found in backup')
    } else {
      summary.assignmentCount = backupData.assignments.length
    }

    // Check for data consistency warnings
    if (summary.assignmentCount > summary.guestCount) {
      warnings.push('More assignments than guests - some assignments may be orphaned')
    }

    if (summary.assignmentCount > summary.bedCount) {
      warnings.push('More assignments than beds - some assignments may be invalid')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
    }
  }

  /**
   * Imports backup data, replacing all current data
   */
  async function importBackup(file: File): Promise<ImportValidationResult> {
    isImporting.value = true
    lastError.value = null

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const validation = validateBackup(data)

      if (!validation.isValid) {
        return validation
      }

      const backup = data as BackupData

      // Clear existing data and import new data
      await restoreFromBackup(backup)

      return validation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import backup'
      lastError.value = message
      return {
        isValid: false,
        errors: [message],
        warnings: [],
        summary: { guestCount: 0, dormitoryCount: 0, roomCount: 0, bedCount: 0, assignmentCount: 0 },
      }
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Restores all stores from backup data
   */
  async function restoreFromBackup(backup: BackupData): Promise<void> {
    const { data } = backup

    // Import guests (this clears existing guests)
    guestStore.clearAllGuests()
    if (data.guests && data.guests.length > 0) {
      guestStore.importGuests(data.guests)
    }

    // Import dormitories (this clears existing dormitories)
    dormitoryStore.importDormitories(data.dormitories || [])

    // Restore assignments
    assignmentStore.assignments.clear()
    if (data.assignments) {
      data.assignments.forEach(([guestId, bedId]) => {
        assignmentStore.assignments.set(guestId, bedId)
      })
    }

    // Restore assignment history
    if (data.assignmentHistory) {
      assignmentStore.assignmentHistory.length = 0
      data.assignmentHistory.forEach(state => {
        assignmentStore.assignmentHistory.push({
          assignments: new Map(state.assignments),
          timestamp: state.timestamp,
        })
      })
    }

    // Restore settings
    if (data.settings) {
      Object.assign(settingsStore.settings, data.settings)
    }

    // Restore timeline config
    if (data.timeline) {
      if (data.timeline.dateRangeStart) {
        timelineStore.config.dateRangeStart = new Date(data.timeline.dateRangeStart)
      }
      if (data.timeline.dateRangeEnd) {
        timelineStore.config.dateRangeEnd = new Date(data.timeline.dateRangeEnd)
      }
      if (data.timeline.collapsedDorms) {
        timelineStore.config.collapsedDorms = data.timeline.collapsedDorms
      }
      if (data.timeline.showUnassignedPanel !== undefined) {
        timelineStore.config.showUnassignedPanel = data.timeline.showUnassignedPanel
      }
      if (data.timeline.columnWidth) {
        timelineStore.setColumnWidth(data.timeline.columnWidth)
      }
    }
  }

  /**
   * Generates a timestamped backup filename
   */
  function generateBackupFilename(): string {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    return `dorm-assignment-backup_${date}_${time}.json`
  }

  /**
   * Triggers a file download in the browser
   */
  function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Creates a file input and triggers file selection
   */
  function selectBackupFile(): Promise<File | null> {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.style.display = 'none'

      input.onchange = () => {
        const file = input.files?.[0] || null
        document.body.removeChild(input)
        resolve(file)
      }

      input.oncancel = () => {
        document.body.removeChild(input)
        resolve(null)
      }

      document.body.appendChild(input)
      input.click()
    })
  }

  return {
    // State
    isExporting,
    isImporting,
    lastError,

    // Methods
    createBackup,
    exportBackup,
    validateBackup,
    importBackup,
    selectBackupFile,
    generateBackupFilename,
  }
}
