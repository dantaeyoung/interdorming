<template>
  <div class="room-config-card" :class="{ 'is-inactive': !localRoom.active }">
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
          <option value="NB">NB</option>
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
        <button
          @click="addBed"
          class="btn-add"
          :class="{ highlighted: highlightedElement === 'add-bed' }"
          title="Add bed"
        >
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
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { staysOverlap, parseLocalDate } from '@/shared/composables/useUtils'
import { useHints } from '@/features/hints/composables/useHints'
import { useBedIdGenerator } from '@/shared/composables/useBedIdGenerator'
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
const dormitoryStore = useDormitoryStore()
const { highlightedElement } = useHints()
const { generateUniqueBedId } = useBedIdGenerator()

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

/**
 * Filter guest IDs to those whose stays overlap the currently editing
 * configuration's window. Edits to a configuration only affect that
 * window — a guest whose stay falls entirely in an earlier (or later)
 * configuration shouldn't be flagged as "affected" by the change.
 *
 * The configuration window uses `null` bounds for "open-ended in this
 * direction" (initial config = `start: null`, last config =
 * `endExclusive: null`). `staysOverlap` interprets missing dates as
 * "always present" which would make every guest match a configuration
 * with an open end — so we use a dedicated overlap check here that
 * treats null bounds as ±infinity instead.
 *
 * If no configuration is selected, falls back to the unfiltered list
 * (legacy single-base behavior).
 */
function filterGuestIdsToCurrentConfigWindow(guestIds: string[]): string[] {
  const selectedId = dormitoryStore.selectedConfigurationId
  if (!selectedId) return guestIds
  const window = dormitoryStore.configurationWindow(selectedId)
  if (!window) return guestIds
  return guestIds.filter(id => {
    const guest = guestStore.guests.find(g => g.id === id)
    if (!guest) return false
    return guestStayOverlapsConfigWindow(guest.arrival, guest.departure, window)
  })
}

/**
 * Half-open overlap of a guest stay `[arrival, departure)` against a
 * configuration window `[start, endExclusive)` where `null` bounds on
 * the window mean ±infinity. Missing guest dates remain "always
 * present" (existing convention) — a guest without arrival/departure
 * affects every configuration's window.
 *
 * Critical: guest dates are stored in mixed formats — Planyo CSVs
 * come in as `"Jun 19, 2026"` while configuration windows are ISO
 * `"2026-06-18"`. Lexical comparison would wrongly conclude
 * `"Jun 19, 2026" >= "2026-12-14"` (because 'J' > '2'), so we parse
 * both sides through `parseLocalDate` and compare epoch ms.
 */
function guestStayOverlapsConfigWindow(
  arrival: string | undefined | null,
  departure: string | undefined | null,
  window: { start: string | null; endExclusive: string | null }
): boolean {
  if (!arrival || !departure) return true
  const arrivalMs = parseLocalDate(arrival).getTime()
  const departureMs = parseLocalDate(departure).getTime()
  if (isNaN(arrivalMs) || isNaN(departureMs)) return true
  if (window.start !== null) {
    const startMs = parseLocalDate(window.start).getTime()
    if (!isNaN(startMs) && departureMs <= startMs) return false
  }
  if (window.endExclusive !== null) {
    const endMs = parseLocalDate(window.endExclusive).getTime()
    if (!isNaN(endMs) && arrivalMs >= endMs) return false
  }
  return true
}

function namesFromGuestIds(guestIds: string[]): string[] {
  return guestIds.map(id => {
    const guest = guestStore.guests.find(g => g.id === id)
    return guest ? `${guest.preferredName || guest.firstName} ${guest.lastName}` : 'Unknown'
  })
}

function updateBed(index: number, updatedBed: Bed) {
  const originalBed = localRoom.value.beds[index]

  // Check if bed is being deactivated and has assigned guests whose
  // stays overlap the currently editing configuration.
  if (originalBed.active && !updatedBed.active) {
    const affectedIds = filterGuestIdsToCurrentConfigWindow(
      assignmentStore.getGuestsAssignedToBed(updatedBed.bedId)
    )
    const affected = namesFromGuestIds(affectedIds)
    if (affected.length > 0) {
      confirmDialogTitle.value = 'Deactivate Bed'
      confirmDialogMessage.value = 'Deactivate this bed in this configuration?'
      confirmDialogDescription.value = `${affected.join(', ')} ${affected.length === 1 ? 'is' : 'are'} assigned to this bed and ${affected.length === 1 ? 'their' : 'their'} stay overlaps this configuration. ${affected.length === 1 ? 'This guest' : 'These guests'} will show a "bed inactive during stay" warning until reassigned.`
      confirmDialogVariant.value = 'warning'
      pendingAction.value = () => {
        // Cuts model: don't auto-unassign — see handleActiveChange.
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
  // Cuts model: removal is per-configuration. If this bedId still
  // exists in another cut, the assignment is still valid there — warn
  // about window-overlapping guests but DON'T auto-unassign (matches
  // the deactivate path; validation surfaces "no bed during stay").
  // Only auto-unassign when the bedId truly disappears everywhere.
  const allAssignedGuestIds = assignmentStore.getGuestsAssignedToBed(bed.bedId)
  const affectedIds = filterGuestIdsToCurrentConfigWindow(allAssignedGuestIds)
  const affected = namesFromGuestIds(affectedIds)
  const selectedId = dormitoryStore.selectedConfigurationId
  const otherCutBedIds = dormitoryStore.getBedIdsInOtherConfigurations(selectedId)
  const trulyGone = !otherCutBedIds.has(bed.bedId)

  confirmDialogTitle.value = 'Remove Bed'
  if (trulyGone && allAssignedGuestIds.length > 0) {
    const names = namesFromGuestIds(allAssignedGuestIds)
    confirmDialogMessage.value = 'Remove this bed?'
    confirmDialogDescription.value = `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} currently assigned to this bed and it doesn't exist in any other configuration. Removing will unassign ${names.length === 1 ? 'this guest' : 'these guests'}.`
  } else if (!trulyGone && affected.length > 0) {
    confirmDialogMessage.value = 'Remove this bed from this configuration?'
    confirmDialogDescription.value = `${affected.join(', ')} ${affected.length === 1 ? 'is' : 'are'} assigned to this bed and ${affected.length === 1 ? 'their' : 'their'} stay overlaps this configuration. ${affected.length === 1 ? 'This guest' : 'These guests'} will show a "no bed during stay" warning until reassigned. Other configurations are unchanged.`
  } else {
    confirmDialogMessage.value = 'Remove this bed?'
    confirmDialogDescription.value = trulyGone
      ? 'This action cannot be undone.'
      : 'This bed will remain in other configurations. This action cannot be undone for this configuration.'
  }
  confirmDialogVariant.value = 'danger'

  pendingAction.value = () => {
    if (trulyGone && allAssignedGuestIds.length > 0) {
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

/**
 * Affected = assigned to beds in this room AND stay overlaps the
 * currently editing configuration's window. Deactivating a room in
 * configuration C should only flag guests whose stay actually
 * intersects C — guests in other configurations are untouched.
 */
function getAffectedGuestNamesForRoom(): string[] {
  const bedIds = getRoomBedIds()
  const guestIds = filterGuestIdsToCurrentConfigWindow(
    assignmentStore.getGuestsAssignedToRoom(bedIds)
  )
  return namesFromGuestIds(guestIds)
}

function handleActiveChange() {
  previousActiveState.value = !localRoom.value.active // Store the opposite since it already changed

  // Check if room is being deactivated and has assigned guests whose
  // stays overlap the currently editing configuration.
  if (!localRoom.value.active) {
    const affected = getAffectedGuestNamesForRoom()
    if (affected.length > 0) {
      confirmDialogTitle.value = 'Deactivate Room'
      confirmDialogMessage.value = 'Deactivate this room in this configuration?'
      confirmDialogDescription.value = `${affected.join(', ')} ${affected.length === 1 ? 'is' : 'are'} assigned to beds in this room and ${affected.length === 1 ? 'their' : 'their'} stay overlaps this configuration. ${affected.length === 1 ? 'This guest' : 'These guests'} will show a "bed inactive during stay" warning until reassigned.`
      confirmDialogVariant.value = 'warning'
      pendingAction.value = () => {
        // Cuts model: deactivation is per-configuration. Don't
        // auto-unassign — the validation system surfaces the warning
        // and the operator decides what to do.
        handleUpdate()
      }
      showConfirmDialog.value = true
      return
    }
  }

  handleUpdate()
}

function handleRemoveRoom() {
  // Cuts model: removing a room only scopes it out of THIS configuration.
  // Other cuts keep the room. Only auto-unassign for bedIds that truly
  // disappear (don't exist in any other cut).
  const bedIds = getRoomBedIds()
  const selectedId = dormitoryStore.selectedConfigurationId
  const otherCutBedIds = dormitoryStore.getBedIdsInOtherConfigurations(selectedId)
  const trulyGoneBedIds = bedIds.filter(id => !otherCutBedIds.has(id))

  const affectedIds = filterGuestIdsToCurrentConfigWindow(
    assignmentStore.getGuestsAssignedToRoom(bedIds)
  )
  const affected = namesFromGuestIds(affectedIds)
  const trulyGoneGuestIds = trulyGoneBedIds.length > 0
    ? assignmentStore.getGuestsAssignedToRoom(trulyGoneBedIds)
    : []
  const trulyGoneGuests = namesFromGuestIds(trulyGoneGuestIds)

  confirmDialogTitle.value = 'Remove Room'
  confirmDialogMessage.value = trulyGoneBedIds.length === bedIds.length
    ? `Remove "${localRoom.value.roomName}"?`
    : `Remove "${localRoom.value.roomName}" from this configuration?`

  const parts: string[] = []
  if (affected.length > 0) {
    parts.push(`${affected.join(', ')} ${affected.length === 1 ? 'is' : 'are'} assigned to beds in this room and ${affected.length === 1 ? 'their' : 'their'} stay overlaps this configuration. ${affected.length === 1 ? 'This guest' : 'These guests'} will show a "no bed during stay" warning until reassigned.`)
  }
  if (trulyGoneGuests.length > 0) {
    parts.push(`${trulyGoneGuests.join(', ')} ${trulyGoneGuests.length === 1 ? 'is' : 'are'} assigned to beds that don't exist in any other configuration — ${trulyGoneGuests.length === 1 ? 'this guest' : 'these guests'} will be unassigned.`)
  }
  if (parts.length === 0) {
    parts.push(trulyGoneBedIds.length === bedIds.length
      ? 'This will also remove all beds in this room. This action cannot be undone.'
      : 'This room will remain in other configurations. This action cannot be undone for this configuration.')
  } else if (trulyGoneBedIds.length < bedIds.length) {
    parts.push('Other configurations are unchanged.')
  }
  confirmDialogDescription.value = parts.join(' ')
  confirmDialogVariant.value = 'danger'

  pendingAction.value = () => {
    if (trulyGoneBedIds.length > 0) {
      assignmentStore.unassignGuestsFromRoom(trulyGoneBedIds)
    }
    emit('remove')
  }
  showConfirmDialog.value = true
}

function addBed() {
  const newPosition = localRoom.value.beds.length + 1
  // Seed across EVERY tree (active + every cut + every template) +
  // local in-flight beds. Without the cross-tree seed, a new bed in
  // cut B could mint an ID that exists in cut A and silently fuse
  // them in the global assignment map.
  const existingIds = dormitoryStore.getAllBedIdsAcrossTrees()
  for (const bed of localRoom.value.beds) {
    existingIds.add(bed.bedId)
  }
  const newBedId = generateUniqueBedId(localRoom.value.roomName, Array.from(existingIds))
  const newBed: Bed = {
    bedId: newBedId,
    bedType: 'single',
    position: newPosition,
    assignments: [],
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
  transition: opacity 0.2s;

  &.is-inactive {
    opacity: 0.5;
  }
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
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #059669;
  }

  &.highlighted {
    animation: btn-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
}

@keyframes btn-pulse {
  0%, 100% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(16, 185, 129, 0.25);
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
