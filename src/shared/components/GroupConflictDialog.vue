<template>
  <Modal :model-value="isOpen" @update:model-value="(v) => !v && dismissGroupConflicts()">
    <div class="group-conflict-dialog">
      <h3 class="title">
        <span class="icon">⚠️</span>
        Group placement blocked
      </h3>
      <p class="lead">
        {{ conflicts.length }} member{{ conflicts.length === 1 ? '' : 's' }} of the group
        would conflict with existing assignments in
        <strong>{{ roomName }}</strong>. No assignments were made.
      </p>
      <ul class="conflict-list">
        <li v-for="(item, idx) in conflicts" :key="idx">
          <strong>{{ item.memberName }}</strong>
          → bed {{ item.bedId }}
          <ul class="overlap-list">
            <li v-for="(overlap, oIdx) in item.conflictsWith" :key="oIdx">
              overlaps with {{ overlap.guestName }}
              ({{ formatRange(overlap.arrival, overlap.departure) }})
            </li>
          </ul>
        </li>
      </ul>
      <p class="hint">
        To place the group, displace the overlapping assignments individually
        first (or update guest dates to avoid overlap), then retry the drop.
      </p>
      <div class="actions">
        <button class="btn-cancel" @click="dismissGroupConflicts">Cancel</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { useGroupConflictDialog } from '@/shared/composables/useGroupConflictDialog'

const { isOpen, roomName, conflicts, dismissGroupConflicts } = useGroupConflictDialog()

function formatRange(arrival?: string, departure?: string): string {
  if (!arrival && !departure) return 'no dates'
  if (arrival && departure) return `${arrival} – ${departure}`
  return arrival || departure || ''
}
</script>

<style scoped lang="scss">
.group-conflict-dialog {
  padding: 24px;
  max-width: 540px;
}

.title {
  margin: 0 0 12px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #92400e;
}

.icon {
  font-size: 1.4rem;
}

.lead {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: #374151;
}

.conflict-list {
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 0.85rem;
  color: #1f2937;

  li {
    margin-bottom: 6px;
  }
}

.overlap-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 0.8rem;
  color: #6b7280;
}

.hint {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: #6b7280;
  font-style: italic;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 18px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: #4b5563;
  }
}
</style>
