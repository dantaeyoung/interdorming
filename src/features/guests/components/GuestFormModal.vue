<template>
  <Modal v-model="isOpen" @close="handleClose" title="Guest Details">
    <form @submit.prevent="handleSubmit" class="guest-form">
      <div class="form-grid">
        <!-- Required Fields -->
        <div class="form-group">
          <label for="firstName">First Name <span class="required">*</span></label>
          <input
            id="firstName"
            v-model="formData.firstName"
            type="text"
            required
            placeholder="Enter first name"
          />
        </div>

        <div class="form-group">
          <label for="lastName">Last Name <span class="required">*</span></label>
          <input
            id="lastName"
            v-model="formData.lastName"
            type="text"
            required
            placeholder="Enter last name"
          />
        </div>

        <div class="form-group">
          <label for="preferredName">Preferred Name</label>
          <input
            id="preferredName"
            v-model="formData.preferredName"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="gender">Gender <span class="required">*</span></label>
          <select id="gender" v-model="formData.gender" required>
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Non-binary/Other">Non-binary/Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="age">Age <span class="required">*</span></label>
          <input
            id="age"
            v-model="formData.age"
            type="number"
            required
            min="0"
            max="120"
            placeholder="Enter age"
          />
        </div>

        <div class="form-group">
          <label for="groupName">Group Name</label>
          <input
            id="groupName"
            v-model="formData.groupName"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="lowerBunk">Lower Bunk Required</label>
          <select id="lowerBunk" v-model="formData.lowerBunk">
            <option :value="false">No</option>
            <option :value="true">Yes</option>
          </select>
        </div>

        <div class="form-group">
          <label for="arrival">Arrival Date</label>
          <input id="arrival" v-model="formData.arrival" type="text" placeholder="Optional" />
        </div>

        <div class="form-group">
          <label for="departure">Departure Date</label>
          <input
            id="departure"
            v-model="formData.departure"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="indivGrp">Individual/Group</label>
          <input id="indivGrp" v-model="formData.indivGrp" type="text" placeholder="Optional" />
        </div>

        <div class="form-group full-width">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            placeholder="Optional notes"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="retreat">Retreat</label>
          <input id="retreat" v-model="formData.retreat" type="text" placeholder="Optional" />
        </div>

        <div class="form-group">
          <label for="ratePerNight">Rate Per Night</label>
          <input
            id="ratePerNight"
            v-model="formData.ratePerNight"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="priceQuoted">Price Quoted</label>
          <input
            id="priceQuoted"
            v-model="formData.priceQuoted"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="amountPaid">Amount Paid</label>
          <input
            id="amountPaid"
            v-model="formData.amountPaid"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="firstVisit">First Visit to TNH Monastery</label>
          <input
            id="firstVisit"
            v-model="formData.firstVisit"
            type="text"
            placeholder="Optional"
          />
        </div>

        <div class="form-group">
          <label for="roomPreference">Room Preference</label>
          <input
            id="roomPreference"
            v-model="formData.roomPreference"
            type="text"
            placeholder="Optional"
          />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" @click="handleClose" class="btn-cancel">Cancel</button>
        <button type="submit" class="btn-submit">{{ isEditMode ? 'Update' : 'Add' }} Guest</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Modal } from '@/shared/components'
import type { Guest, Gender } from '@/types'

interface Props {
  show: boolean
  guest?: Guest
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', guest: Partial<Guest>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.show,
  set: (value: boolean) => {
    if (!value) {
      handleClose()
    }
  }
})

const initialFormData = {
  firstName: '',
  lastName: '',
  preferredName: '',
  gender: '' as Gender | '',
  age: '' as string | number,
  groupName: '',
  lowerBunk: false,
  arrival: '',
  departure: '',
  indivGrp: '',
  notes: '',
  retreat: '',
  ratePerNight: '',
  priceQuoted: '',
  amountPaid: '',
  firstVisit: '',
  roomPreference: '',
}

const formData = ref({
  firstName: '',
  lastName: '',
  preferredName: '',
  gender: '' as Gender | '',
  age: '' as string | number,
  groupName: '',
  lowerBunk: false,
  arrival: '',
  departure: '',
  indivGrp: '',
  notes: '',
  retreat: '',
  ratePerNight: '',
  priceQuoted: '',
  amountPaid: '',
  firstVisit: '',
  roomPreference: '',
})

const isEditMode = ref(false)

// Watch for guest prop changes to populate form in edit mode
watch(
  () => props.guest,
  newGuest => {
    if (newGuest) {
      isEditMode.value = true
      formData.value = {
        firstName: newGuest.firstName || '',
        lastName: newGuest.lastName || '',
        preferredName: newGuest.preferredName || '',
        gender: newGuest.gender || '',
        age: newGuest.age || '',
        groupName: newGuest.groupName || '',
        lowerBunk: newGuest.lowerBunk || false,
        arrival: newGuest.arrival || '',
        departure: newGuest.departure || '',
        indivGrp: newGuest.indivGrp || '',
        notes: newGuest.notes || '',
        retreat: newGuest.retreat || '',
        ratePerNight: newGuest.ratePerNight || '',
        priceQuoted: newGuest.priceQuoted || '',
        amountPaid: newGuest.amountPaid || '',
        firstVisit: newGuest.firstVisit || '',
        roomPreference: newGuest.roomPreference || '',
      }
    } else {
      isEditMode.value = false
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = { ...initialFormData }
}

function hasUnsavedChanges(): boolean {
  // Check if any field has been modified from initial state
  if (props.guest) {
    // In edit mode, compare with original guest data
    return (
      formData.value.firstName !== (props.guest.firstName || '') ||
      formData.value.lastName !== (props.guest.lastName || '') ||
      formData.value.preferredName !== (props.guest.preferredName || '') ||
      formData.value.gender !== (props.guest.gender || '') ||
      formData.value.age !== (props.guest.age || '') ||
      formData.value.groupName !== (props.guest.groupName || '') ||
      formData.value.lowerBunk !== (props.guest.lowerBunk || false) ||
      formData.value.arrival !== (props.guest.arrival || '') ||
      formData.value.departure !== (props.guest.departure || '') ||
      formData.value.indivGrp !== (props.guest.indivGrp || '') ||
      formData.value.notes !== (props.guest.notes || '') ||
      formData.value.retreat !== (props.guest.retreat || '') ||
      formData.value.ratePerNight !== (props.guest.ratePerNight || '') ||
      formData.value.priceQuoted !== (props.guest.priceQuoted || '') ||
      formData.value.amountPaid !== (props.guest.amountPaid || '') ||
      formData.value.firstVisit !== (props.guest.firstVisit || '') ||
      formData.value.roomPreference !== (props.guest.roomPreference || '')
    )
  } else {
    // In add mode, check if any field has been filled
    return (
      formData.value.firstName !== '' ||
      formData.value.lastName !== '' ||
      formData.value.preferredName !== '' ||
      formData.value.gender !== '' ||
      formData.value.age !== '' ||
      formData.value.groupName !== '' ||
      formData.value.lowerBunk !== false ||
      formData.value.arrival !== '' ||
      formData.value.departure !== '' ||
      formData.value.indivGrp !== '' ||
      formData.value.notes !== '' ||
      formData.value.retreat !== '' ||
      formData.value.ratePerNight !== '' ||
      formData.value.priceQuoted !== '' ||
      formData.value.amountPaid !== '' ||
      formData.value.firstVisit !== '' ||
      formData.value.roomPreference !== ''
    )
  }
}

function handleClose() {
  if (hasUnsavedChanges()) {
    const confirmed = window.confirm(
      'You have unsaved changes. Are you sure you want to close? Your edits will be lost.'
    )
    if (!confirmed) {
      return
    }
  }
  resetForm()
  emit('close')
}

function handleSubmit() {
  const guestData: Partial<Guest> = {
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    preferredName: formData.value.preferredName || undefined,
    gender: formData.value.gender as Gender,
    age: formData.value.age,
    groupName: formData.value.groupName || undefined,
    lowerBunk: formData.value.lowerBunk,
    arrival: formData.value.arrival || undefined,
    departure: formData.value.departure || undefined,
    indivGrp: formData.value.indivGrp || undefined,
    notes: formData.value.notes || undefined,
    retreat: formData.value.retreat || undefined,
    ratePerNight: formData.value.ratePerNight || undefined,
    priceQuoted: formData.value.priceQuoted || undefined,
    amountPaid: formData.value.amountPaid || undefined,
    firstVisit: formData.value.firstVisit || undefined,
    roomPreference: formData.value.roomPreference || undefined,
  }

  if (props.guest) {
    guestData.id = props.guest.id
  }

  emit('submit', guestData)
  handleClose()
}
</script>

<style scoped lang="scss">
.guest-form {
  padding: 20px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;

    .required {
      color: #ef4444;
    }
  }

  input,
  select,
  textarea {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
}

.btn-submit {
  background: #3b82f6;
  color: white;

  &:hover {
    background: #2563eb;
  }

  &:active {
    transform: scale(0.98);
  }
}
</style>
