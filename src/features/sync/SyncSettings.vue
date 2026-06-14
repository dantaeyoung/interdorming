<template>
  <div class="settings-section">
    <h2>Cloud Sync <span class="beta-tag">optional</span></h2>
    <p class="section-description">
      Securely sync guests, rooms, and assignments between devices through your
      own server. Everything is end-to-end encrypted in your browser — the
      server only ever sees scrambled data. This is off by default; the app
      works fully without it.
    </p>

    <!-- Enable toggle -->
    <div class="setting-row">
      <label class="toggle-label">
        <input
          type="checkbox"
          :checked="syncStore.enabled"
          @change="syncStore.setEnabled(($event.target as HTMLInputElement).checked)"
        />
        <span class="toggle-text">Enable cloud sync</span>
      </label>
      <span class="setting-description">Turn syncing on for this device.</span>
    </div>

    <template v-if="syncStore.enabled">
      <!-- Server URL -->
      <div class="field-row">
        <label class="field-label" for="sync-server-url">Server URL</label>
        <input
          id="sync-server-url"
          type="url"
          class="text-input"
          placeholder="https://sync.example.org"
          :value="syncStore.serverUrl"
          @input="syncStore.serverUrl = ($event.target as HTMLInputElement).value"
        />
      </div>

      <!-- Operator name -->
      <div class="field-row">
        <label class="field-label" for="sync-operator">Your name</label>
        <input
          id="sync-operator"
          type="text"
          class="text-input"
          placeholder="e.g. Br. Phap Luu"
          :value="syncStore.operatorName"
          @input="syncStore.operatorName = ($event.target as HTMLInputElement).value"
        />
        <span class="setting-description">Shown to others when you save changes.</span>
      </div>

      <!-- Password + unlock -->
      <div class="field-row">
        <label class="field-label" for="sync-password">Shared password</label>
        <div class="password-row">
          <input
            id="sync-password"
            type="password"
            class="text-input"
            placeholder="The password is the workspace"
            v-model="password"
            @keyup.enter="onUnlock"
          />
          <button class="btn-primary" :disabled="!canUnlock" @click="onUnlock">
            {{ unlocked ? 'Re-unlock' : 'Unlock' }}
          </button>
        </div>
      </div>

      <div class="setting-row">
        <label class="toggle-label">
          <input
            type="checkbox"
            :checked="syncStore.rememberOnDevice"
            @change="syncStore.setRememberOnDevice(($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-text">Remember on this device</span>
        </label>
        <span class="setting-description">
          Stay unlocked after a refresh. Only do this on a device you trust.
        </span>
      </div>

      <!-- Manual actions -->
      <div class="action-row">
        <button class="btn-secondary" :disabled="!unlocked" @click="onPush">Sync now</button>
        <button class="btn-secondary" :disabled="!unlocked" @click="onPull">Pull now</button>
        <span class="status-line" :class="`status-${syncStore.status}`">
          {{ statusLabel }}
        </span>
      </div>

      <p class="warning-note">
        ⚠️ If the shared password is lost, the cloud copy can’t be recovered —
        but your data here on this device is always safe.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSharedSync } from './useSync'

const syncStore = useSyncStore()
const sync = useSharedSync()

const password = ref('')
const unlocked = ref(false)

const canUnlock = computed(
  () => password.value.length > 0 && syncStore.serverUrl.trim().length > 0,
)

const statusLabel = computed(() => {
  switch (syncStore.status) {
    case 'idle':
      return unlocked.value ? 'Synced' : 'Ready'
    case 'syncing':
      return 'Syncing…'
    case 'offline':
      return 'Offline — changes saved locally'
    case 'conflict':
      return 'Conflict — someone else saved'
    case 'error':
      return 'Error: ' + (syncStore.lastError ?? 'unknown')
    case 'locked':
      return 'Locked'
    default:
      return ''
  }
})

async function onUnlock() {
  if (!canUnlock.value) return
  const ok = await sync.unlock(password.value)
  unlocked.value = ok
  // Don't keep the password in the field once we've unlocked.
  if (ok && !syncStore.rememberOnDevice) password.value = ''
}

async function onPush() {
  await sync.pushNow()
}

async function onPull() {
  await sync.pullNow()
}
</script>

<style scoped lang="scss">
.settings-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .section-description {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }
}

.beta-tag {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 2px 6px;
  vertical-align: middle;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #1f2937;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.text-input {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  max-width: 420px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
}

.password-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.setting-description {
  font-size: 0.8rem;
  color: #9ca3af;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
  border-color: #d1d5db;
}

.status-line {
  font-size: 0.85rem;
  font-weight: 500;

  &.status-idle {
    color: #059669;
  }
  &.status-syncing {
    color: #6366f1;
  }
  &.status-offline {
    color: #d97706;
  }
  &.status-conflict {
    color: #dc2626;
  }
  &.status-error {
    color: #dc2626;
  }
}

.warning-note {
  margin: 16px 0 0 0;
  padding: 10px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 0.825rem;
  color: #92400e;
  line-height: 1.5;
}
</style>
