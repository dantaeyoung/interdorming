<template>
  <div class="room-config-card">
    <div class="room-header">
      <div class="room-title">
        <input
          v-model="localRoom.roomName"
          class="room-name-input"
          placeholder="Room Name"
          @blur="handleUpdate"
        />
        <select v-model="localRoom.roomGender" class="gender-select" @change="handleUpdate">
          <option value="M">M</option>
          <option value="F">F</option>
          <option value="Coed">Coed</option>
        </select>
      </div>
      <div class="room-actions">
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="localRoom.active"
            @change="handleActiveChange"
          />
          <span>Active</span>
        </label>
        <button @click="addBed" class="btn-add" title="Add bed">
          + Bed
        </button>
        <button @click="handleRemoveRoom" class="btn-remove" title="Remove room">
          ✕
        </button>
      </div>
    </div>

    <div class="beds-list">
      <BedConfigItem
        v-for="(bed, index) in localRoom.beds"
        :key="bed.bedId"
        :bed="bed"
        @update="(updatedBed) => updateBed(index, updatedBed)"
        @remove="removeBed(index)"
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
import { ref, watch, computed } from 'vue'
import BedConfigItem from './BedConfigItem.vue'
import { ConfirmDialog } from '@/shared/components'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useGuestStore } from '@/stores/guestStore'
import type { Room, Bed } from '@/types'

interface Props {
  room: Room
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [room: Room]
  remove: []
}>()

const assignmentStore = useAssignmentStore()
const guestStore = useGuestStore()

const localRoom = ref<Room>({ ...props.room, beds: [...props.room.beds] })

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('Confirm Action')
const confirmDialogMessage = ref('')
const confirmDialogDescription = ref('')
const confirmDialogVariant = ref<'danger' | 'warning'>('danger')
const pendingAction = ref<(() => void) | null>(null)
const previousActiveState = ref(true)

watch(() => props.room, (newRoom) => {
  localRoom.value = { ...newRoom, beds: [...newRoom.beds] }
}, { deep: true })

function handleUpdate() {
  emit('update', { ...localRoom.value })
}

function getAssignedGuestNames(bedId: string): string[] {
  const guestIds = assignmentStore.getGuestsAssignedToBed(bedId)
  return guestIds.map(id => {
    const guest = guestStore.guests.find(g => g.id === id)
    return guest ? `${guest.preferredName || guest.firstName} ${guest.lastName}` : 'Unknown'
  })
}

function updateBed(index: number, updatedBed: Bed) {
  const originalBed = localRoom.value.beds[index]

  // Check if bed is being deactivated and has assigned guests
  if (originalBed.active && !updatedBed.active) {
    const assignedGuests = getAssignedGuestNames(updatedBed.bedId)
    if (assignedGuests.length > 0) {
      confirmDialogTitle.value = 'Deactivate Bed'
      confirmDialogMessage.value = 'Deactivate this bed?'
      confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to this bed. Deactivating will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
      confirmDialogVariant.value = 'warning'
      pendingAction.value = () => {
        assignmentStore.unassignGuestsFromBed(updatedBed.bedId)
        localRoom.value.beds[index] = updatedBed
        handleUpdate()
      }
      showConfirmDialog.value = true
      return
    }
  }

  localRoom.value.beds[index] = updatedBed
  handleUpdate()
}

function removeBed(index: number) {
  const bed = localRoom.value.beds[index]
  const assignedGuests = getAssignedGuestNames(bed.bedId)

  confirmDialogTitle.value = 'Remove Bed'
  if (assignedGuests.length > 0) {
    confirmDialogMessage.value = 'Remove this bed?'
    confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to this bed. Removing will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
  } else {
    confirmDialogMessage.value = 'Remove this bed?'
    confirmDialogDescription.value = 'This action cannot be undone.'
  }
  confirmDialogVariant.value = 'danger'

  pendingAction.value = () => {
    if (assignedGuests.length > 0) {
      assignmentStore.unassignGuestsFromBed(bed.bedId)
    }
    localRoom.value.beds.splice(index, 1)
    handleUpdate()
  }
  showConfirmDialog.value = true
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
  // Revert active state if canceling room deactivation
  if (localRoom.value.active !== previousActiveState.value) {
    localRoom.value.active = previousActiveState.value
  }
}

// Room-level confirmation functions
function getRoomBedIds(): string[] {
  return localRoom.value.beds.map(bed => bed.bedId)
}

function getAssignedGuestNamesForRoom(): string[] {
  const bedIds = getRoomBedIds()
  const guestIds = assignmentStore.getGuestsAssignedToRoom(bedIds)
  return guestIds.map(id => {
    const guest = guestStore.guests.find(g => g.id === id)
    return guest ? `${guest.preferredName || guest.firstName} ${guest.lastName}` : 'Unknown'
  })
}

function handleActiveChange() {
  previousActiveState.value = !localRoom.value.active // Store the opposite since it already changed

  // Check if room is being deactivated and has assigned guests
  if (!localRoom.value.active) {
    const assignedGuests = getAssignedGuestNamesForRoom()
    if (assignedGuests.length > 0) {
      confirmDialogTitle.value = 'Deactivate Room'
      confirmDialogMessage.value = 'Deactivate this room?'
      confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to beds in this room. Deactivating will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
      confirmDialogVariant.value = 'warning'
      pendingAction.value = () => {
        const bedIds = getRoomBedIds()
        assignmentStore.unassignGuestsFromRoom(bedIds)
        handleUpdate()
      }
      showConfirmDialog.value = true
      return
    }
  }

  handleUpdate()
}

function handleRemoveRoom() {
  const assignedGuests = getAssignedGuestNamesForRoom()

  confirmDialogTitle.value = 'Remove Room'
  if (assignedGuests.length > 0) {
    confirmDialogMessage.value = `Remove "${localRoom.value.roomName}"?`
    confirmDialogDescription.value = `${assignedGuests.join(', ')} ${assignedGuests.length === 1 ? 'is' : 'are'} currently assigned to beds in this room. Removing will unassign ${assignedGuests.length === 1 ? 'this guest' : 'these guests'}.`
  } else {
    confirmDialogMessage.value = `Remove "${localRoom.value.roomName}"?`
    confirmDialogDescription.value = 'This will also remove all beds in this room. This action cannot be undone.'
  }
  confirmDialogVariant.value = 'danger'

  pendingAction.value = () => {
    if (assignedGuests.length > 0) {
      const bedIds = getRoomBedIds()
      assignmentStore.unassignGuestsFromRoom(bedIds)
    }
    emit('remove')
  }
  showConfirmDialog.value = true
}

function addBed() {
  const newPosition = localRoom.value.beds.length + 1
  const roomPrefix = localRoom.value.roomName.substring(0, 2).toUpperCase()
  const newBed: Bed = {
    bedId: `${roomPrefix}${String(newPosition).padStart(2, '0')}`,
    bedType: 'single',
    position: newPosition,
    assignedGuestId: null,
    active: true
  }
  localRoom.value.beds.push(newBed)
  handleUpdate()
}
</script>

<style scoped lang="scss">
.room-config-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.room-header {
  padding: 10px 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.room-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.room-name-input {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  flex: 1;
  min-width: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.gender-select {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
}

.room-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;

  input[type="checkbox"] {
    cursor: pointer;
  }
}

.btn-add {
  padding: 4px 10px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: #059669;
  }
}

.btn-remove {
  padding: 4px 8px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #dc2626;
  }
}

.beds-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
