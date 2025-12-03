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
            @change="handleUpdate"
          />
          <span>Active</span>
        </label>
        <button @click="addBed" class="btn-add" title="Add bed">
          + Bed
        </button>
        <button @click="$emit('remove')" class="btn-remove" title="Remove room">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BedConfigItem from './BedConfigItem.vue'
import type { Room, Bed } from '@/types'

interface Props {
  room: Room
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [room: Room]
  remove: []
}>()

const localRoom = ref<Room>({ ...props.room, beds: [...props.room.beds] })

watch(() => props.room, (newRoom) => {
  localRoom.value = { ...newRoom, beds: [...newRoom.beds] }
}, { deep: true })

function handleUpdate() {
  emit('update', { ...localRoom.value })
}

function updateBed(index: number, updatedBed: Bed) {
  localRoom.value.beds[index] = updatedBed
  handleUpdate()
}

function removeBed(index: number) {
  localRoom.value.beds.splice(index, 1)
  handleUpdate()
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
