<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Guests Already Loaded</h2>
          <button class="btn-close" @click="handleCancel">×</button>
        </div>

        <div class="modal-body">
          <p class="modal-description">
            You already have {{ existingGuestCount }} guest{{ existingGuestCount !== 1 ? 's' : '' }} loaded.
            How would you like to handle the new CSV file?
          </p>

          <div class="option-cards">
            <div class="option-card">
              <div class="option-icon reset">🔄</div>
              <h3 class="option-title">Reset and Replace</h3>
              <p class="option-description">
                Clear all existing guests and assignments, then load the new CSV file.
                This will erase all current data.
              </p>
              <button class="btn btn-danger" @click="handleResetAndReplace">
                Reset and Replace
              </button>
            </div>

            <div class="option-card">
              <div class="option-icon merge">➕</div>
              <h3 class="option-title">Add & Update</h3>
              <p class="option-description">
                Keep existing guests. Update matching guests (by name) with new data,
                and add any new guests from the CSV.
              </p>
              <button class="btn btn-primary" @click="handleAddAndUpdate">
                Add & Update
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleCancel">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  existingGuestCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  'reset-and-replace': []
  'add-and-update': []
  cancel: []
}>()

function handleResetAndReplace() {
  emit('reset-and-replace')
}

function handleAddAndUpdate() {
  emit('add-and-update')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
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
    color: #374151;
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-description {
  margin: 0 0 24px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.option-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.option-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
}

.option-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;

  &.reset {
    filter: grayscale(0.2);
  }

  &.merge {
    filter: grayscale(0.2);
  }
}

.option-title {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.option-description {
  margin: 0 0 16px 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.5;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;

  &:active {
    transform: scale(0.98);
  }
}

.btn-primary {
  background: #3b82f6;
  color: white;

  &:hover {
    background: #2563eb;
  }
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;

  &:hover {
    background: #d1d5db;
  }
}

.btn-danger {
  background: #ef4444;
  color: white;

  &:hover {
    background: #dc2626;
  }
}
</style>
