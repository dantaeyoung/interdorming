<template>
  <div class="csv-upload">
    <label for="csv-file-input" class="form-label">{{ label }}</label>
    <div class="upload-controls">
      <input
        id="csv-file-input"
        ref="fileInput"
        type="file"
        accept=".csv"
        class="form-input"
        @change="handleFileChange"
      />
      <button v-if="showLoadTest" class="btn" @click="$emit('load-test-data')">
        Load Test Data
      </button>
    </div>
    <p v-if="hint" class="upload-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useGuestStore } from '@/stores/guestStore'
import type { Guest } from '@/types'

interface Props {
  label?: string
  hint?: string
  showLoadTest?: boolean
}

withDefaults(defineProps<Props>(), {
  label: 'Upload CSV File',
  hint: '',
  showLoadTest: false,
})

const emit = defineEmits<{
  'upload-success': [guests: Guest[]]
  'upload-error': [error: string]
  'load-test-data': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const guestStore = useGuestStore()
const { parseGuestCSV } = useCSV()

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const csvText = await readFileAsText(file)
    const guests = parseGuestCSV(csvText)

    // Import guests into store
    guestStore.importGuests(guests)

    emit('upload-success', guests)

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
    emit('upload-error', errorMessage)

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
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
.csv-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.upload-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-input {
  max-width: 300px;
}

.upload-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
