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
          <label for="housingType">Housing Type</label>
          <select id="housingType" v-model="formData.housingType">
            <option value="">Not set</option>
            <option value="Dorm">Dorm</option>
            <option value="BCM-RV">BCM-RV</option>
            <option value="Camping">Camping</option>
            <option value="Commuter">Commuter</option>
          </select>
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
          <input id="arrival" v-model="formData.arrival" type="date" />
        </div>

        <div class="form-group">
          <label for="departure">Departure Date</label>
          <input id="departure" v-model="formData.departure" type="date" />
        </div>

        <div class="form-group">
          <label for="indivGrp">Individual/Group</label>
          <input id="indivGrp" v-model="formData.indivGrp" type="text" placeholder="Optional" />
        </div>

        <div class="form-group full-width">
          <label for="notes">Notes <span class="field-hint">(from CSV)</span></label>
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            placeholder="Optional notes"
          ></textarea>
        </div>

        <div class="form-group full-width">
          <label for="internalNotes">Internal Notes <span class="field-hint">(operator-only, never overwritten by CSV)</span></label>
          <textarea
            id="internalNotes"
            v-model="formData.internalNotes"
            rows="3"
            placeholder="Anything you want to remember about this guest"
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
        <button v-if="isEditMode" type="button" @click="handleDelete" class="btn-delete">Delete Guest</button>
        <div class="form-actions-right">
          <button type="button" @click="handleClose" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-submit">{{ isEditMode ? 'Update' : 'Add' }} Guest</button>
        </div>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Modal } from '@/shared/components'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { useGuestStore } from '@/stores/guestStore'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { staysOverlap, useUtils } from '@/shared/composables/useUtils'
import type { Guest, Gender } from '@/types'

interface Props {
  show: boolean
  guest?: Guest
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', guest: Partial<Guest>): void
  (e: 'delete', guestId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// We need to manage the modal state internally to prevent it from closing
// when user cancels the confirmation dialog
const internalShow = ref(false)

const isOpen = computed({
  get: () => internalShow.value,
  set: (value: boolean) => {
    if (!value) {
      handleClose()
    }
  }
})

// Sync internal show state with prop
watch(
  () => props.show,
  (newValue) => {
    internalShow.value = newValue
  },
  { immediate: true }
)

const initialFormData = {
  firstName: '',
  lastName: '',
  preferredName: '',
  gender: '' as Gender | '',
  age: '' as string | number,
  groupName: '',
  housingType: '',
  lowerBunk: false,
  arrival: '',
  departure: '',
  indivGrp: '',
  notes: '',
  internalNotes: '',
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
  housingType: '',
  lowerBunk: false,
  arrival: '',
  departure: '',
  indivGrp: '',
  notes: '',
  internalNotes: '',
  retreat: '',
  ratePerNight: '',
  priceQuoted: '',
  amountPaid: '',
  firstVisit: '',
  roomPreference: '',
})

const isEditMode = ref(false)

/**
 * Convert a YYYY-MM-DD ISO string (from `<input type="date">`) back into
 * the human-readable "Month DD, YYYY" format the rest of the app uses
 * (e.g. "May 15, 2026"). Returns the input unchanged if it's not in
 * recognized ISO form.
 */
function isoToDisplayDate(iso: string): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  if (month < 0 || month > 11) return iso
  return `${monthNames[month]} ${day}, ${year}`
}

/**
 * Parse various date formats into YYYY-MM-DD for the date input.
 * Handles: "Apr 29, 2026", "30-May-25", "May 03, 2026", "2026-04-29", "03/01", etc.
 */
function parseDateToISO(dateStr: string): string {
  if (!dateStr) return ''

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  // Try native Date parsing (handles "Apr 29, 2026", "May 03, 2026", etc.)
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020) {
    return parsed.toISOString().split('T')[0]
  }

  // Handle "30-May-25" (DD-Mon-YY) format
  const dmy = dateStr.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    const attempt = new Date(`${dmy[2]} ${dmy[1]}, ${year}`)
    if (!isNaN(attempt.getTime())) {
      return attempt.toISOString().split('T')[0]
    }
  }

  // Can't parse — return empty so the date picker starts blank
  return ''
}

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
        housingType: newGuest.housingType || '',
        lowerBunk: newGuest.lowerBunk || false,
        arrival: parseDateToISO(newGuest.arrival || ''),
        departure: parseDateToISO(newGuest.departure || ''),
        indivGrp: newGuest.indivGrp || '',
        notes: newGuest.notes || '',
        internalNotes: newGuest.internalNotes || '',
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
  // Helper to normalize age for comparison (convert to string)
  const normalizeAge = (age: string | number | undefined): string => {
    if (age === undefined || age === null || age === '') return ''
    return String(age)
  }

  // Check if any field has been modified from initial state
  if (props.guest) {
    // In edit mode, compare with original guest data
    return (
      formData.value.firstName !== (props.guest.firstName || '') ||
      formData.value.lastName !== (props.guest.lastName || '') ||
      formData.value.preferredName !== (props.guest.preferredName || '') ||
      formData.value.gender !== (props.guest.gender || '') ||
      normalizeAge(formData.value.age) !== normalizeAge(props.guest.age) ||
      formData.value.groupName !== (props.guest.groupName || '') ||
      formData.value.housingType !== (props.guest.housingType || '') ||
      formData.value.lowerBunk !== (props.guest.lowerBunk || false) ||
      // Form holds dates as YYYY-MM-DD; original is "Month DD, YYYY" —
      // compare in display format to avoid spurious "unsaved changes".
      isoToDisplayDate(formData.value.arrival) !== (props.guest.arrival || '') ||
      isoToDisplayDate(formData.value.departure) !== (props.guest.departure || '') ||
      formData.value.indivGrp !== (props.guest.indivGrp || '') ||
      formData.value.notes !== (props.guest.notes || '') ||
      formData.value.internalNotes !== (props.guest.internalNotes || '') ||
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
      normalizeAge(formData.value.age) !== '' ||
      formData.value.groupName !== '' ||
      formData.value.housingType !== '' ||
      formData.value.lowerBunk !== false ||
      formData.value.arrival !== '' ||
      formData.value.departure !== '' ||
      formData.value.indivGrp !== '' ||
      formData.value.notes !== '' ||
      formData.value.internalNotes !== '' ||
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
  const hasChanges = hasUnsavedChanges()

  if (hasChanges) {
    const confirmed = window.confirm(
      'You have unsaved changes. Are you sure you want to close? Your edits will be lost.'
    )
    if (!confirmed) {
      // User cancelled - keep modal open by resetting internal state
      internalShow.value = true
      return
    }
  }

  // Close the modal first, then reset form
  internalShow.value = false
  emit('close')

  // Reset form after a short delay to avoid triggering watches while props are still set
  setTimeout(() => {
    resetForm()
  }, 100)
}

function handleDelete() {
  if (!props.guest) return
  const name = `${props.guest.firstName} ${props.guest.lastName}`
  const confirmed = window.confirm(`Are you sure you want to delete ${name}? This will also remove any room assignment. This cannot be undone.`)
  if (confirmed) {
    emit('delete', props.guest.id)
    internalShow.value = false
    emit('close')
  }
}

function handleSubmit() {
  const guestData: Partial<Guest> = {
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    preferredName: formData.value.preferredName || undefined,
    gender: formData.value.gender as Gender,
    age: formData.value.age,
    groupName: formData.value.groupName || undefined,
    housingType: formData.value.housingType || undefined,
    lowerBunk: formData.value.lowerBunk,
    // Convert ISO back to human-readable form so stored dates stay in the
    // "Month DD, YYYY" format used everywhere else in the app.
    arrival: isoToDisplayDate(formData.value.arrival) || undefined,
    departure: isoToDisplayDate(formData.value.departure) || undefined,
    indivGrp: formData.value.indivGrp || undefined,
    notes: formData.value.notes || undefined,
    internalNotes: formData.value.internalNotes || undefined,
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

  // Date-aware conflict check: if the operator changed arrival/departure
  // and the new range now overlaps another assignment on the SAME bed,
  // confirm before saving.
  if (props.guest && props.guest.id && shouldCheckDateConflict(props.guest, guestData)) {
    const conflicts = findBedConflicts(props.guest.id, guestData.arrival, guestData.departure)
    if (conflicts.length > 0) {
      const lines = conflicts.map(c => {
        const range = c.arrival && c.departure ? `${c.arrival}–${c.departure}` : 'no dates'
        return `${c.guestName} (${range})`
      })
      const ok = window.confirm(
        `Saving will create a date conflict on bed ${conflicts[0].bedId}:\n\n` +
        lines.join('\n') +
        `\n\nSave anyway?`
      )
      if (!ok) return
    }
  }

  emit('submit', guestData)

  // Close modal directly without unsaved changes check (we're saving!)
  internalShow.value = false
  emit('close')
  setTimeout(() => {
    resetForm()
  }, 100)
}

const assignmentStore = useAssignmentStore()
const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const { createFullName } = useUtils()

function shouldCheckDateConflict(
  original: Guest,
  updated: Partial<Guest>
): boolean {
  // Only relevant if dates actually changed and the guest is currently
  // assigned to a bed.
  if (!assignmentStore.assignments.has(original.id)) return false
  return original.arrival !== updated.arrival || original.departure !== updated.departure
}

interface BedConflict {
  bedId: string
  guestName: string
  arrival?: string
  departure?: string
}

function findBedConflicts(
  guestId: string,
  newArrival?: string,
  newDeparture?: string
): BedConflict[] {
  const bedId = assignmentStore.assignments.get(guestId)
  if (!bedId) return []
  const bed = dormitoryStore.getBedById(bedId)
  if (!bed) return []
  const updatedStay = { arrival: newArrival, departure: newDeparture }
  const conflicts: BedConflict[] = []
  for (const a of bed.assignments) {
    if (a.guestId === guestId) continue
    const other = guestStore.getGuestById(a.guestId)
    if (!other) continue
    if (staysOverlap(other, updatedStay)) {
      conflicts.push({
        bedId,
        guestName: createFullName(other),
        arrival: other.arrival,
        departure: other.departure,
      })
    }
  }
  return conflicts
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

    .field-hint {
      font-weight: 400;
      font-size: 0.7rem;
      color: #9ca3af;
      margin-left: 4px;
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
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.form-actions-right {
  display: flex;
  gap: 12px;
}

.btn-delete {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #fca5a5;
  background: #fef2f2;
  color: #dc2626;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
    border-color: #ef4444;
  }
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
