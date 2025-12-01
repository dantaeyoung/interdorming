<template>
  <div class="room-config-csv">
    <div class="button-group">
      <button class="btn" @click="handleExport">Export Room Config</button>
      <button class="btn" @click="triggerImport">Import Room Config</button>
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        style="display: none"
        @change="handleImport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import type { Dormitory } from '@/types'

const emit = defineEmits<{
  'export-success': []
  'export-error': [error: string]
  'import-success': [dormitories: Dormitory[]]
  'import-error': [error: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dormitoryStore = useDormitoryStore()
const { generateCSV, downloadCSV, generateTimestampedFilename, parseCSVRow } = useCSV()

function handleExport() {
  try {
    const exportData: any[] = []

    dormitoryStore.dormitories.forEach(dormitory => {
      dormitory.rooms.forEach(room => {
        room.beds.forEach(bed => {
          exportData.push({
            dormitoryName: dormitory.dormitoryName,
            dormitoryActive: dormitory.active ? 'Yes' : 'No',
            dormitoryColor: dormitory.color || '',
            roomName: room.roomName,
            roomGender: room.roomGender,
            roomActive: room.active ? 'Yes' : 'No',
            bedId: bed.bedId,
            bedType: bed.bedType,
            bedPosition: bed.position,
            bedActive: bed.active !== false ? 'Yes' : 'No',
          })
        })
      })
    })

    const columns = [
      { key: 'dormitoryName' as const, label: 'Dormitory Name' },
      { key: 'dormitoryActive' as const, label: 'Dormitory Active' },
      { key: 'dormitoryColor' as const, label: 'Dormitory Color' },
      { key: 'roomName' as const, label: 'Room Name' },
      { key: 'roomGender' as const, label: 'Room Gender' },
      { key: 'roomActive' as const, label: 'Room Active' },
      { key: 'bedId' as const, label: 'Bed ID' },
      { key: 'bedType' as const, label: 'Bed Type' },
      { key: 'bedPosition' as const, label: 'Bed Position' },
      { key: 'bedActive' as const, label: 'Bed Active' },
    ]

    const csvContent = generateCSV(exportData, columns)
    const filename = generateTimestampedFilename('room_config', '.csv')

    downloadCSV(csvContent, filename)

    emit('export-success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export room config'
    emit('export-error', errorMessage)
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const csvText = await readFileAsText(file)
    const dormitories = parseRoomConfigCSV(csvText)

    dormitoryStore.importDormitories(dormitories)

    emit('import-success', dormitories)

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to import room config'
    emit('import-error', errorMessage)

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function parseRoomConfigCSV(csvText: string): Dormitory[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const dormitoriesMap = new Map<string, Dormitory>()

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i])

    const dormitoryName = values[headers.indexOf('Dormitory Name')]?.trim()
    const roomName = values[headers.indexOf('Room Name')]?.trim()
    const bedId = values[headers.indexOf('Bed ID')]?.trim()

    if (!dormitoryName || !roomName || !bedId) continue

    // Get or create dormitory
    if (!dormitoriesMap.has(dormitoryName)) {
      dormitoriesMap.set(dormitoryName, {
        dormitoryName,
        active: values[headers.indexOf('Dormitory Active')]?.toLowerCase() !== 'no',
        color: values[headers.indexOf('Dormitory Color')] || '#f8f9fa',
        rooms: [],
      })
    }

    const dormitory = dormitoriesMap.get(dormitoryName)!
    let room = dormitory.rooms.find(r => r.roomName === roomName)

    // Create room if doesn't exist
    if (!room) {
      room = {
        roomName,
        roomGender: (values[headers.indexOf('Room Gender')] || 'M') as any,
        active: values[headers.indexOf('Room Active')]?.toLowerCase() !== 'no',
        beds: [],
      }
      dormitory.rooms.push(room)
    }

    // Add bed
    room.beds.push({
      bedId,
      bedType: (values[headers.indexOf('Bed Type')] || 'single') as any,
      position: parseInt(values[headers.indexOf('Bed Position')] || '1'),
      assignedGuestId: null,
      active: values[headers.indexOf('Bed Active')]?.toLowerCase() !== 'no',
    })
  }

  return Array.from(dormitoriesMap.values())
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
</script>

<style scoped lang="scss">
.room-config-csv {
  .button-group {
    display: flex;
    gap: 10px;
  }
}
</style>
