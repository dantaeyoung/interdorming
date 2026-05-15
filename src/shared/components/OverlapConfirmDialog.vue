<template>
  <ConfirmDialog
    :model-value="isOpen"
    title="Stay overlaps existing assignment"
    :message="message"
    :description="description"
    confirm-text="Replace"
    cancel-text="Cancel"
    variant="warning"
    @update:model-value="onModelValue"
    @confirm="confirmOverlap"
    @cancel="cancelOverlap"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useOverlapConfirm } from '@/shared/composables/useOverlapConfirm'

const { isOpen, currentRequest, confirmOverlap, cancelOverlap } = useOverlapConfirm()

function fmtRange(arrival?: string, departure?: string): string {
  if (!arrival && !departure) return 'no dates'
  if (arrival && departure) return `${arrival} – ${departure}`
  return arrival || departure || ''
}

const message = computed(() => {
  const r = currentRequest.value
  if (!r) return ''
  return `${r.guestName} (${fmtRange(r.guestArrival, r.guestDeparture)}) would conflict with ${r.overlapping.length === 1 ? 'an existing assignment' : `${r.overlapping.length} existing assignments`} on bed ${r.bedId}.`
})

const description = computed(() => {
  const r = currentRequest.value
  if (!r) return ''
  const lines = r.overlapping.map(o => `• ${o.guestName} (${fmtRange(o.arrival, o.departure)})`)
  return `Overlapping assignment${r.overlapping.length === 1 ? '' : 's'}:\n${lines.join('\n')}\n\nClick Replace to remove the overlapping assignment${r.overlapping.length === 1 ? '' : 's'} and place this guest. Click Cancel to do nothing.`
})

function onModelValue(value: boolean) {
  if (!value) cancelOverlap()
}
</script>
