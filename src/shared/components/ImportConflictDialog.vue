<template>
  <Modal :is-open="isOpen" @close="dismissImportConflicts">
    <div class="import-conflict-dialog">
      <h3 class="title">
        <span class="icon">⚠️</span>
        New bed conflicts after import
      </h3>
      <p class="lead">
        Date changes from the CSV import created
        <strong>{{ conflicts.length }}</strong> bed
        {{ conflicts.length === 1 ? 'conflict' : 'conflicts' }}. Each bed
        below now has overlapping assignments. Please resolve them in the
        Assignment view.
      </p>
      <ul class="conflict-list">
        <li v-for="(item, idx) in conflicts" :key="idx">
          <div class="bed-id">Bed {{ item.bedId }}</div>
          <ul class="guest-list">
            <li v-for="(g, gIdx) in item.guests" :key="gIdx">
              {{ g.guestName }} ({{ formatRange(g.arrival, g.departure) }})
            </li>
          </ul>
        </li>
      </ul>
      <div class="actions">
        <button class="btn-ok" @click="dismissImportConflicts">Got it</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { useImportConflictDialog } from '@/shared/composables/useImportConflictDialog'

const { isOpen, conflicts, dismissImportConflicts } = useImportConflictDialog()

function formatRange(arrival?: string, departure?: string): string {
  if (!arrival && !departure) return 'no dates'
  if (arrival && departure) return `${arrival} – ${departure}`
  return arrival || departure || ''
}
</script>

<style scoped lang="scss">
.import-conflict-dialog {
  padding: 24px;
  max-width: 560px;
  max-height: 70vh;
  overflow-y: auto;
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
  list-style: none;
  margin: 0 0 16px;
  padding: 0;

  > li {
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
    border-radius: 4px;
  }
}

.bed-id {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1f2937;
  margin-bottom: 4px;
}

.guest-list {
  margin: 0;
  padding-left: 20px;
  font-size: 0.85rem;
  color: #6b7280;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.btn-ok {
  padding: 8px 18px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #1d4ed8;
  }
}
</style>
