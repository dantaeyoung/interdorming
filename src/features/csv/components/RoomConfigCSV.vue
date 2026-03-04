<template>
  <div class="room-config-csv">
    <div class="button-group">
      <button v-if="showLoadDefault" class="btn btn-secondary" @click="handleLoadDefault">
        Load Default Rooms
      </button>

      <!-- Export dropdown -->
      <div class="dropdown" ref="exportDropdown">
        <button class="btn" @click="toggleExportMenu">
          Export
          <span class="dropdown-arrow">&#9662;</span>
        </button>
        <div v-if="showExportMenu" class="dropdown-menu">
          <button class="dropdown-item" @click="handleExportAllJSON">
            Export All Layouts (JSON)
          </button>
          <button class="dropdown-item" @click="handleExportCurrentJSON">
            Export Current Layout (JSON)
          </button>
          <button class="dropdown-item" @click="handleExportCSV">
            Export CSV (Legacy)
          </button>
        </div>
      </div>

      <button class="btn" @click="triggerImport">Import</button>
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.json"
        style="display: none"
        @change="handleImport"
      />
    </div>

    <!-- Import mode dialog for JSON -->
    <ConfirmDialog
      v-model="showImportModeDialog"
      title="Import Layouts"
      :message="importModeMessage"
      confirm-text="Replace All"
      cancel-text="Merge"
      variant="warning"
      @confirm="handleImportReplace"
      @cancel="handleImportMerge"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { ConfirmDialog } from '@/shared/components'
import type { Dormitory, RoomLayout } from '@/types'

interface Props {
  showLoadDefault?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLoadDefault: false,
})

const emit = defineEmits<{
  'export-success': []
  'export-error': [error: string]
  'import-success': [dormitories: Dormitory[]]
  'import-error': [error: string]
  'load-default-rooms': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const exportDropdown = ref<HTMLElement | null>(null)
const showExportMenu = ref(false)
const showImportModeDialog = ref(false)
const pendingImportLayouts = ref<RoomLayout[]>([])
const importModeMessage = ref('')

const dormitoryStore = useDormitoryStore()
const { generateCSV, downloadCSV, generateTimestampedFilename, parseCSVRow } = useCSV()

// Close export menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (exportDropdown.value && !exportDropdown.value.contains(event.target as Node)) {
    showExportMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

// --- JSON Export ---

function handleExportAllJSON() {
  showExportMenu.value = false
  try {
    // Save current state first
    dormitoryStore.saveCurrentToActiveLayout()

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      layouts: dormitoryStore.layouts,
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const filename = generateTimestampedFilename('room_layouts', '.json')

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    emit('export-success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export layouts'
    emit('export-error', errorMessage)
  }
}

function handleExportCurrentJSON() {
  showExportMenu.value = false
  try {
    dormitoryStore.saveCurrentToActiveLayout()

    const activeLayout = dormitoryStore.activeLayout
    if (!activeLayout) {
      emit('export-error', 'No active layout to export')
      return
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      layouts: [activeLayout],
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const slug = activeLayout.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+$/, '') || 'layout'
    const filename = generateTimestampedFilename(slug, '.json')

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    emit('export-success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export layout'
    emit('export-error', errorMessage)
  }
}

// --- Legacy CSV Export ---

function handleExportCSV() {
  showExportMenu.value = false
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

    let csvContent = ''
    if (dormitoryStore.configName) {
      csvContent += `# Config: ${dormitoryStore.configName}\n`
    }
    csvContent += generateCSV(exportData, columns)

    const configSlug = dormitoryStore.configName
      ? dormitoryStore.configName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+$/, '')
      : 'room_config'
    const filename = generateTimestampedFilename(configSlug, '.csv')

    downloadCSV(csvContent, filename)

    emit('export-success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export room config'
    emit('export-error', errorMessage)
  }
}

// --- Import ---

function triggerImport() {
  fileInput.value?.click()
}

function handleLoadDefault() {
  emit('load-default-rooms')
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const text = await readFileAsText(file)
    const isJSON = file.name.endsWith('.json')

    if (isJSON) {
      await handleJSONImport(text)
    } else {
      handleCSVImport(text)
    }

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to import room config'
    emit('import-error', errorMessage)

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function handleJSONImport(jsonText: string) {
  const data = JSON.parse(jsonText)

  if (!data.layouts || !Array.isArray(data.layouts) || data.layouts.length === 0) {
    throw new Error('Invalid layout JSON: no layouts found')
  }

  const importedLayouts: RoomLayout[] = data.layouts
  pendingImportLayouts.value = importedLayouts

  const count = importedLayouts.length
  const names = importedLayouts.map((l: RoomLayout) => l.name).join(', ')
  importModeMessage.value = `Import ${count} layout${count > 1 ? 's' : ''} (${names})?\n\n"Replace All" will overwrite existing layouts.\n"Merge" will add them alongside existing ones.`
  showImportModeDialog.value = true
}

function handleImportReplace() {
  dormitoryStore.importLayouts(pendingImportLayouts.value, 'replace')
  showImportModeDialog.value = false
  emit('import-success', dormitoryStore.dormitories)
  pendingImportLayouts.value = []
}

function handleImportMerge() {
  dormitoryStore.importLayouts(pendingImportLayouts.value, 'merge')
  showImportModeDialog.value = false
  emit('import-success', dormitoryStore.dormitories)
  pendingImportLayouts.value = []
}

function handleCSVImport(csvText: string) {
  const dormitories = parseRoomConfigCSV(csvText)

  // Create a new layout from the CSV import
  const configName = dormitoryStore.configName || 'Imported Layout'
  dormitoryStore.createLayout(configName, 'Imported from CSV')

  // Import the dormitories into the new active layout
  dormitoryStore.importDormitories(dormitories)

  emit('import-success', dormitories)
}

function parseRoomConfigCSV(csvText: string): Dormitory[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  // Check for config name comment line and skip it
  let startLine = 0
  if (lines[0].startsWith('# Config:')) {
    const configName = lines[0].replace('# Config:', '').trim()
    dormitoryStore.configName = configName
    startLine = 1
  }

  const headers = lines[startLine].split(',').map(h => h.trim().replace(/"/g, ''))
  const dormitoriesMap = new Map<string, Dormitory>()

  for (let i = startLine + 1; i < lines.length; i++) {
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
    align-items: center;
  }
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-arrow {
  font-size: 0.7em;
  margin-left: 4px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 220px;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.825rem;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #f3f4f6;
  }

  & + & {
    border-top: 1px solid #f3f4f6;
  }
}
</style>
