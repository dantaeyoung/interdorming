<template>
  <Transition name="banner-slide">
    <div v-if="syncStore.status === 'conflict'" class="conflict-banner" role="alert">
      <span class="banner-text">
        ⚠️ Someone else saved changes{{ agoText }}. Your edits are still here on this device.
      </span>
      <div class="banner-actions">
        <button class="btn-reload" :disabled="busy" @click="onReload">Reload theirs</button>
        <button class="btn-overwrite" :disabled="busy" @click="onOverwrite">Keep mine</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSharedSync } from './useSync'

const syncStore = useSyncStore()
const sync = useSharedSync()
const busy = ref(false)

const agoText = computed(() => {
  if (!syncStore.lastSyncedAt) return ''
  const mins = Math.round((Date.now() - syncStore.lastSyncedAt) / 60000)
  if (mins < 1) return ' just now'
  return ` about ${mins} min ago`
})

async function onReload() {
  busy.value = true
  // 'reload' pulls theirs (applies + reloads the page to re-hydrate).
  await sync.resolveConflict('reload')
  busy.value = false
}

async function onOverwrite() {
  busy.value = true
  // 'overwrite' re-pushes local against the server's current revision.
  await sync.resolveConflict('overwrite')
  busy.value = false
}
</script>

<style scoped lang="scss">
.conflict-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.875rem;
}

.banner-text {
  font-weight: 500;
}

.banner-actions {
  display: flex;
  gap: 8px;
}

.btn-reload,
.btn-overwrite {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-reload {
  background: #dc2626;
  color: white;
}

.btn-overwrite {
  background: white;
  color: #991b1b;
  border-color: #fca5a5;
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.2s ease;
}
.banner-slide-enter-from,
.banner-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
