<template>
  <Modal :model-value="isOpen" :title="modalTitle" max-width="640px" @update:model-value="(v) => !v && cancel()">
    <div class="form">
      <p v-if="preset" class="preset-summary">
        Applying <strong>{{ preset.name }}</strong> will emit {{ preset.entries.length }} override{{ preset.entries.length === 1 ? '' : 's' }}.
      </p>

      <div class="date-row">
        <label class="field">
          <span class="field-label">From</span>
          <input v-model="effectiveFrom" type="date" />
        </label>
        <label class="field">
          <span class="field-label">To (leave blank for open-ended)</span>
          <input v-model="effectiveTo" type="date" />
        </label>
      </div>

      <label class="field">
        <span class="field-label">Note (optional)</span>
        <input v-model="note" type="text" placeholder="e.g. Confirmed by retreat coordinator" />
      </label>

      <div v-if="dateError" class="warning-banner error">
        {{ dateError }}
      </div>

      <div v-if="conflicts.length > 0" class="conflicts">
        <h4>⚠ {{ conflicts.length }} existing assignment{{ conflicts.length === 1 ? '' : 's' }} will be affected</h4>
        <p class="conflicts-hint">Applying anyway keeps these guests on their beds with a new warning. You can unassign or move them later.</p>
        <ul>
          <li v-for="(c, idx) in conflicts" :key="idx">
            <strong>{{ c.guestName }}</strong>
            <span class="dates">{{ c.arrival ?? '?' }} → {{ c.departure ?? '?' }}</span>
            on <code>{{ c.bedId }}</code>
            <span class="reason">— {{ c.reason }}</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <button class="btn" @click="cancel">Cancel</button>
      <button class="btn btn-primary" :disabled="!canApply" @click="apply">
        {{ conflicts.length > 0 ? `Apply anyway (${conflicts.length})` : 'Apply' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/shared/components/Modal.vue'
import { useDormitoryStore } from '@/stores/dormitoryStore'
import { useGuestStore } from '@/stores/guestStore'
import { useAssignmentStore } from '@/stores/assignmentStore'
import { staysOverlap } from '@/shared/composables/useUtils'
import type { OverridePreset, PresetTemplateEntry } from '@/types'

interface Props {
  isOpen: boolean
  preset: OverridePreset | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dormitoryStore = useDormitoryStore()
const guestStore = useGuestStore()
const assignmentStore = useAssignmentStore()

const effectiveFrom = ref<string>('')
const effectiveTo = ref<string>('')
const note = ref<string>('')

const modalTitle = computed(() => `Apply preset: ${props.preset?.name ?? ''}`)

watch(
  () => [props.isOpen, props.preset] as const,
  ([open, preset]) => {
    if (open && preset) {
      effectiveFrom.value = todayIso()
      effectiveTo.value = ''
      note.value = ''
    }
  },
  { immediate: true }
)

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateError = computed<string | null>(() => {
  if (!effectiveFrom.value) return 'Pick a "From" date.'
  if (effectiveTo.value && effectiveTo.value < effectiveFrom.value) {
    return '"To" must be on or after "From".'
  }
  return null
})

/**
 * Beds affected by each entry — used both for the conflict preview AND for the
 * actual override emission (so the operator sees what they're about to commit).
 */
function affectedBedsForEntry(entry: PresetTemplateEntry): string[] {
  const out: string[] = []
  for (const dorm of dormitoryStore.dormitories) {
    if (entry.target.kind === 'dormitory') {
      if (dorm.dormitoryName !== entry.target.dormitoryName) continue
      for (const room of dorm.rooms) for (const bed of room.beds) out.push(bed.bedId)
    } else if (entry.target.kind === 'room') {
      if (dorm.dormitoryName !== entry.target.dormitoryName) continue
      for (const room of dorm.rooms) {
        if (room.roomName !== entry.target.roomName) continue
        for (const bed of room.beds) out.push(bed.bedId)
      }
    } else {
      for (const room of dorm.rooms) {
        for (const bed of room.beds) if (bed.bedId === entry.target.bedId) out.push(bed.bedId)
      }
    }
  }
  return out
}

interface Conflict {
  bedId: string
  guestName: string
  arrival?: string
  departure?: string
  reason: string
}

const conflicts = computed<Conflict[]>(() => {
  if (!props.preset || !effectiveFrom.value) return []
  const window = {
    arrival: effectiveFrom.value,
    departure: effectiveTo.value || undefined,
  }
  const out: Conflict[] = []
  const seen = new Set<string>()

  for (const entry of props.preset.entries) {
    const beds = affectedBedsForEntry(entry)
    for (const bedId of beds) {
      const bed = dormitoryStore.getBedById(bedId)
      if (!bed) continue
      for (const a of bed.assignments) {
        const guest = guestStore.getGuestById(a.guestId)
        if (!guest) continue
        if (!staysOverlap(guest, window)) continue
        const dedupeKey = `${bedId}|${a.guestId}|${entry.target.kind}|${entry.change.attr}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        let reason = ''
        if (entry.change.attr === 'active' && entry.change.value === false) {
          reason = `bed becomes inactive (${entry.target.kind} closed)`
        } else if (entry.change.attr === 'gender') {
          reason = `room gender → ${entry.change.value}` +
            (entry.change.value !== guest.gender && entry.change.value !== 'Coed' && guest.gender !== 'Non-binary/Other'
              ? ` (guest is ${guest.gender})`
              : '')
        } else {
          reason = `${entry.target.kind} ${entry.change.attr} → ${entry.change.value}`
        }
        out.push({
          bedId,
          guestName: `${guest.firstName} ${guest.lastName}`.trim(),
          arrival: guest.arrival || undefined,
          departure: guest.departure || undefined,
          reason,
        })
      }
    }
  }
  return out
})

const canApply = computed(() => {
  if (!props.preset) return false
  if (dateError.value) return false
  return true
})

function apply() {
  if (!props.preset || !canApply.value) return
  dormitoryStore.applyPreset(
    props.preset.id,
    effectiveFrom.value,
    effectiveTo.value || null,
    note.value.trim() || undefined
  )
  // Silence unused-variable warning — assignmentStore is loaded to register
  // the store so its assignments are reactive in this scope (used inside
  // conflicts via getBedById which reads bed.assignments).
  void assignmentStore
  emit('close')
}

function cancel() {
  emit('close')
}
</script>

<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preset-summary {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
}

.date-row {
  display: flex;
  gap: 12px;

  .field { flex: 1; }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
}

input[type="text"],
input[type="date"] {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.warning-banner {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;

  &.error {
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #991b1b;
  }
}

.conflicts {
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 6px;
  padding: 10px 14px;

  h4 {
    margin: 0 0 4px 0;
    font-size: 0.9rem;
    color: #92400e;
  }

  .conflicts-hint {
    margin: 0 0 8px 0;
    font-size: 0.8rem;
    color: #92400e;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 0.85rem;

    li {
      margin-bottom: 3px;
      color: #1f2937;
    }
  }

  .dates {
    color: #6b7280;
    margin-left: 6px;
  }

  code {
    background: #fef3c7;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.8rem;
  }

  .reason {
    color: #92400e;
    margin-left: 4px;
  }
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover { background: #f3f4f6; }

  &.btn-primary {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;

    &:hover { background: #4338ca; }

    &:disabled { background: #c7d2fe; cursor: not-allowed; }
  }
}
</style>
