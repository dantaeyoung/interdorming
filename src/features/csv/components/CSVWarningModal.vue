<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>CSV Import Summary</h2>
        <button class="close-button" @click="close" aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <div class="success-message">
          <span class="success-icon">✓</span>
          Successfully loaded {{ successCount }} guest{{ successCount !== 1 ? 's' : '' }}
        </div>

        <div v-if="warnings.length > 0" class="warnings-section">
          <div class="warnings-header">
            <span class="warning-icon">⚠</span>
            {{ warnings.length }} row{{ warnings.length !== 1 ? 's were' : ' was' }} skipped:
          </div>
          <ul class="warnings-list">
            <li v-for="(warning, index) in warnings" :key="index" class="warning-item">
              {{ warning }}
            </li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  successCount: number
  totalRows: number
  warnings: string[]
}

withDefaults(defineProps<Props>(), {
  isOpen: false,
  successCount: 0,
  totalRows: 0,
  warnings: () => [],
})

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.75rem;
    line-height: 1;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background-color: #f3f4f6;
      color: #111827;
    }
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #065f46;

  .success-icon {
    font-size: 1.5rem;
    color: #10b981;
  }
}

.warnings-section {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  padding: 16px;
}

.warnings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 12px;
  font-size: 0.95rem;

  .warning-icon {
    font-size: 1.25rem;
    color: #f59e0b;
  }
}

.warnings-list {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.warning-item {
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 6px;
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2563eb;
  }

  &:active {
    background-color: #1d4ed8;
  }
}
</style>
