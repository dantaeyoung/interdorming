<template>
  <span v-if="syncStore.enabled" class="sync-chip" :class="`sync-${syncStore.status}`" :title="title">
    <span class="dot" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '@/stores/syncStore'

const syncStore = useSyncStore()

const label = computed(() => {
  switch (syncStore.status) {
    case 'syncing':
      return 'Syncing…'
    case 'offline':
      return 'Offline'
    case 'conflict':
      return 'Conflict'
    case 'error':
      return 'Sync error'
    case 'locked':
      return 'Locked'
    case 'idle':
    default:
      return 'Synced'
  }
})

const title = computed(() => {
  if (syncStore.status === 'offline') return 'Changes are saved locally and will sync when the server is back.'
  if (syncStore.status === 'conflict') return 'Someone else saved changes. Resolve in the banner.'
  if (syncStore.lastSyncedAt) return 'Last synced ' + new Date(syncStore.lastSyncedAt).toLocaleString()
  return 'Cloud sync'
})
</script>

<style scoped lang="scss">
.sync-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.15);
  color: white;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  &.sync-idle {
    color: #bbf7d0;
  }
  &.sync-syncing {
    color: #c7d2fe;
  }
  &.sync-offline {
    color: #fde68a;
  }
  &.sync-conflict,
  &.sync-error {
    color: #fecaca;
  }
}
</style>
