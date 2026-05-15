<template>
  <Modal :model-value="isOpen" @update:model-value="(v) => !v && dismissImportSummary()">
    <div class="import-summary-dialog">
      <h3 class="title">CSV import summary</h3>
      <p class="lead">
        Here's what changed compared to the previous data. Please review
        and resolve anything that needs attention in the Assignment view.
      </p>

      <!-- Cancellations -->
      <section v-if="cancellations.length > 0" class="summary-section">
        <h4 class="section-title cancellations">
          <span class="icon">🚫</span>
          {{ cancellations.length }} cancellation{{ cancellations.length === 1 ? '' : 's' }}
        </h4>
        <ul class="item-list">
          <li v-for="(item, idx) in cancellations" :key="`cx-${idx}`">
            <strong>{{ item.guestName }}</strong>
            <span v-if="item.bedId" class="meta">— bed {{ item.bedId }}</span>
            <span v-if="item.arrival || item.departure" class="meta">
              ({{ formatRange(item.arrival, item.departure) }})
            </span>
            <span v-if="item.status" class="status">{{ item.status }}</span>
          </li>
        </ul>
        <p class="hint">
          Cancelled guests are kept in the data and highlighted in red so
          you can review and unassign them yourself.
        </p>
      </section>

      <!-- Date changes -->
      <section v-if="dateChanges.length > 0" class="summary-section">
        <h4 class="section-title date-changes">
          <span class="icon">📅</span>
          {{ dateChanges.length }} date change{{ dateChanges.length === 1 ? '' : 's' }}
        </h4>
        <ul class="item-list">
          <li v-for="(item, idx) in dateChanges" :key="`dx-${idx}`">
            <strong>{{ item.guestName }}</strong>:
            {{ formatRange(item.oldArrival, item.oldDeparture) }}
            →
            <strong>{{ formatRange(item.newArrival, item.newDeparture) }}</strong>
          </li>
        </ul>
      </section>

      <!-- Bed conflicts -->
      <section v-if="bedConflicts.length > 0" class="summary-section">
        <h4 class="section-title bed-conflicts">
          <span class="icon">⚠️</span>
          {{ bedConflicts.length }} new bed conflict{{ bedConflicts.length === 1 ? '' : 's' }}
        </h4>
        <ul class="item-list">
          <li v-for="(item, idx) in bedConflicts" :key="`bx-${idx}`">
            <strong>Bed {{ item.bedId }}</strong>
            <ul class="sub-list">
              <li v-for="(g, gIdx) in item.guests" :key="gIdx">
                {{ g.guestName }} ({{ formatRange(g.arrival, g.departure) }})
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <div class="actions">
        <button class="btn-ok" @click="dismissImportSummary">Got it</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { useImportSummary } from '@/shared/composables/useImportSummary'

const { isOpen, cancellations, dateChanges, bedConflicts, dismissImportSummary } = useImportSummary()

function formatRange(arrival?: string, departure?: string): string {
  if (!arrival && !departure) return 'no dates'
  if (arrival && departure) return `${arrival} – ${departure}`
  return arrival || departure || ''
}
</script>

<style scoped lang="scss">
.import-summary-dialog {
  padding: 24px;
  max-width: 620px;
  max-height: 75vh;
  overflow-y: auto;
}

.title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  color: #1f2937;
}

.lead {
  margin: 0 0 18px;
  font-size: 0.85rem;
  color: #4b5563;
}

.summary-section {
  margin-bottom: 18px;

  &:last-of-type {
    margin-bottom: 12px;
  }
}

.section-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;

  &.cancellations { color: #b91c1c; }
  &.date-changes  { color: #1d4ed8; }
  &.bed-conflicts { color: #92400e; }
}

.icon {
  font-size: 1.1rem;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;

  > li {
    padding: 6px 10px;
    margin-bottom: 4px;
    background: #f9fafb;
    border-left: 3px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #1f2937;
  }
}

.cancellations + .item-list > li,
.summary-section:has(.cancellations) .item-list > li {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.date-changes + .item-list > li,
.summary-section:has(.date-changes) .item-list > li {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.bed-conflicts + .item-list > li,
.summary-section:has(.bed-conflicts) .item-list > li {
  border-left-color: #f59e0b;
  background: #fef3c7;
}

.meta {
  color: #6b7280;
  font-weight: 400;
  margin-left: 4px;
}

.status {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sub-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 0.8rem;
  color: #6b7280;

  li { padding: 0; background: none; border: none; margin-bottom: 0; }
}

.hint {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
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
