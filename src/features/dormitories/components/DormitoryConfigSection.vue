<template>
  <div class="dormitory-config-section">
    <div class="dormitory-header">
      <div class="dormitory-title">
        <input
          v-model="localDormitory.dormitoryName"
          class="dormitory-name-input"
          placeholder="Dormitory Name"
          @blur="handleUpdate"
        />
        <input
          v-model="localDormitory.color"
          type="color"
          class="color-picker"
          title="Dormitory color"
          @change="handleUpdate"
        />
      </div>
      <div class="dormitory-actions">
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="localDormitory.active"
            @change="handleActiveChange"
          />
          <span>Active</span>
        </label>
        <button @click="addRoom" class="btn-add" title="Add room">
          + Room
        </button>
        <button @click="handleRemoveDormitory" class="btn-remove" title="Remove dormitory">
          ✕ Dorm
        </button>
      </div>
    </div>

    <div class="rooms-container">
      <RoomConfigCard
        v-for="(room, index) in localDormitory.rooms"
        :key="room.roomName"
        :room="room"
        @update="(updatedRoom) => updateRoom(index, updatedRoom)"
        @remove="removeRoom(index)"
      />
    </div>

    <ConfirmDialog
      v-model="showConfirmDialog"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :description="confirmDialogDescription"
      :variant="confirmDialogVariant"
      confirm-text="Yes, proceed"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import RoomConfigCard from './RoomConfigCard.vue'
import { ConfirmDialog } from '@/shared/components'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useGuestStore } from '@/stores/guestStore'
import type { Dormitory, Room } from '@/types'

interface Props {
  dormitory: Dormitory
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [dormitory: Dormitory]
  remove: []
}>()

const assignmentStore = useAssignmentStore()
const guestStore = useGuestStore()

const localDormitory = ref<Dormitory>({
  ...props.dormitory,
  rooms: [...props.dormitory.rooms]
})

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('Confirm Action')
const confirmDialogMessage = ref('')
const confirmDialogDescription = ref('')
const confirmDialogVariant = ref<'danger' | 'warning'>('danger')
const pendingAction = ref<(() => void) | null>(null)
const previousActiveState = ref(true)

watch(() => props.dormitory, (newDormitory) => {
  localDormitory.value = { ...newDormitory, rooms: [...newDormitory.rooms] }
}, { deep: true })

function handleUpdate() {
  emit('update', { ...localDormitory.value })
}

// Get all bed IDs in this dormitory
function getDormitoryBedIds(): string[] {
  const bedIds: string[] = []
  for (const room of localDormitory.value.rooms) {
    for (const bed of room.beds) {
      bedIds.push(bed.bedId)
    }
  }
  return bedIds
}

function getAssignedGuestNames(): string[] {
  const bedIds = getDormitoryBedIds()
  const guestIds = assignmentStore.getGuestsAssignedToDormitory(bedIds)
  return guestIds.map(id => {
    const guest = guestStore.guests.find(g => g.id === id)
    return guest ? `${guest.preferredName || guest.firstName} ${guest.lastName}` : 'Unknown'
  })
}

function handleConfirm() {
  if (pendingAction.value) {
    pendingAction.value()
  }
  showConfirmDialog.value = false
  pendingAction.value = null
}

function handleCancel() {
  showConfirmDialog.value = false
  pendingAction.value = null
  // Revert active state if canceling dormitory deactivation
  if (localDormitory.value.active !== previousActiveState.value) {
    localDormitory.value.active = previousActiveState.value
  }
}

function handleActiveChange() {
  previousActiveState.value = !localDormitory.value.active // Store the opposite since it already changed

  // Check if dormitory is being deactivated and has assigned guests
  if (!localDormitory.value.active) {
    const assignedGuests = getAssignedGuestNames()
    if (assignedGuests.length > 0) {
      confirmDialogTitle.value = 'Deactivate Dormitory'
      confirmDialogMessage.value = 'Deactivate this dormitory?'
      confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to beds in this dormitory. Deactivating will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
      confirmDialogVariant.value = 'warning'
      pendingAction.value = () => {
        const bedIds = getDormitoryBedIds()
        assignmentStore.unassignGuestsFromDormitory(bedIds)
        handleUpdate()
      }
      showConfirmDialog.value = true
      return
    }
  }

  handleUpdate()
}

function handleRemoveDormitory() {
  const assignedGuests = getAssignedGuestNames()

  confirmDialogTitle.value = 'Remove Dormitory'
  if (assignedGuests.length > 0) {
    confirmDialogMessage.value = `Remove "${localDormitory.value.dormitoryName}"?`
    confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to beds in this dormitory. Removing will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
  } else {
    confirmDialogMessage.value = `Remove "${localDormitory.value.dormitoryName}"?`
    confirmDialogDescription.value = 'This will also remove all rooms and beds in this dormitory. This action cannot be undone.'
  }
  confirmDialogVariant.value = 'danger'

  pendingAction.value = () => {
    if (assignedGuests.length > 0) {
      const bedIds = getDormitoryBedIds()
      assignmentStore.unassignGuestsFromDormitory(bedIds)
    }
    emit('remove')
  }
  showConfirmDialog.value = true
}

function updateRoom(index: number, updatedRoom: Room) {
  localDormitory.value.rooms[index] = updatedRoom
  handleUpdate()
}

function removeRoom(index: number) {
  localDormitory.value.rooms.splice(index, 1)
  handleUpdate()
}

function addRoom() {
  const newRoomNumber = localDormitory.value.rooms.length + 1
  const newRoom: Room = {
    roomName: `Room ${newRoomNumber}`,
    roomGender: 'Coed',
    active: true,
    beds: []
  }
  localDormitory.value.rooms.push(newRoom)
  handleUpdate()
}
</script>

<style scoped lang="scss">
.dormitory-config-section {
  border: 1px solid #e5e7eb;
  border-left: 4px solid #4299e1;
  border-radius: 8px;
  padding: 12px;
  background: white;
  margin-bottom: 16px;
}

.dormitory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e5e7eb;
}

.dormitory-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.dormitory-name-input {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  flex: 1;
  max-width: 300px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.color-picker {
  width: 40px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.dormitory-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;

  input[type="checkbox"] {
    cursor: pointer;
  }
}

.btn-add {
  padding: 6px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: #059669;
  }
}

.btn-remove {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: #dc2626;
  }
}

.rooms-container {
  display: grid;
  gap: 10px;
}
</style>
