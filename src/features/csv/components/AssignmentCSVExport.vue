<template>
  <button class="btn" :disabled="disabled || !hasData" @click="handleExport">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCSV } from '../composables/useCSV'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useUtils } from '@/shared/composables/useUtils'

interface Props {
  label?: string
  filename?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Export CSV',
  filename: 'dorm_assignments',
})

const emit = defineEmits<{
  'export-success': []
  'export-error': [error: string]
}>()

const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()
const dormitoryStore = useDormitoryStore()
const { generateCSV, downloadCSV, generateTimestampedFilename } = useCSV()
const { createDisplayName } = useUtils()

const hasData = computed(() => guestStore.guests.length > 0)

function handleExport() {
  try {
    const exportData = guestStore.guests.map(guest => {
      const bedId = assignmentStore.getAssignmentByGuest(guest.id)
      const room = bedId ? dormitoryStore.getRoomByBedId(bedId) : undefined

      return {
        firstName: guest.firstName,
        lastName: guest.lastName,
        preferredName: guest.preferredName || '',
        displayName: createDisplayName(guest),
        gender: guest.gender,
        age: guest.age,
        groupName: guest.groupName || '',
        lowerBunk: guest.lowerBunk ? 'Yes' : 'No',
        arrival: guest.arrival || '',
        departure: guest.departure || '',
        assignedRoom: room?.roomName || '',
        assignedBed: bedId || '',
        dormitory: room?.dormitoryName || '',
      }
    })

    const columns = [
      { key: 'firstName' as const, label: 'First Name' },
      { key: 'lastName' as const, label: 'Last Name' },
      { key: 'preferredName' as const, label: 'Preferred Name' },
      { key: 'gender' as const, label: 'Gender' },
      { key: 'age' as const, label: 'Age' },
      { key: 'groupName' as const, label: 'Group Name' },
      { key: 'lowerBunk' as const, label: 'Lower Bunk' },
      { key: 'arrival' as const, label: 'Arrival' },
      { key: 'departure' as const, label: 'Departure' },
      { key: 'dormitory' as const, label: 'Dormitory' },
      { key: 'assignedRoom' as const, label: 'Assigned Room' },
      { key: 'assignedBed' as const, label: 'Assigned Bed' },
    ]

    const csvContent = generateCSV(exportData, columns)
    const filename = generateTimestampedFilename(props.filename, '.csv')

    downloadCSV(csvContent, filename)

    emit('export-success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export CSV'
    emit('export-error', errorMessage)
  }
}
</script>
