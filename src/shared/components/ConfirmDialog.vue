<template>
  <Modal
    v-model="isOpen"
    :title="title"
    :show-default-footer="false"
    :close-on-backdrop="!loading"
    :close-on-escape="!loading"
    max-width="500px"
  >
    <div class="confirm-dialog-body">
      <div v-if="icon" class="icon-container" :class="`icon-${variant}`">
        <span class="icon">{{ icon }}</span>
      </div>
      <div class="message-container">
        <p class="message">{{ message }}</p>
        <p v-if="description" class="description">{{ description }}</p>
      </div>
    </div>

    <template #footer>
      <button class="btn" :disabled="loading" @click="handleCancel">
        {{ cancelText }}
      </button>
      <button
        :class="['btn', confirmButtonClass]"
        :disabled="loading"
        @click="handleConfirm"
      >
        <span v-if="loading" class="spinner"></span>
        {{ loading ? loadingText : confirmText }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Modal from './Modal.vue'

interface Props {
  modelValue: boolean
  title?: string
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
  loadingText?: string
  variant?: 'danger' | 'warning' | 'info' | 'primary'
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  loadingText: 'Processing...',
  variant: 'danger',
  icon: '⚠️',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const loading = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const confirmButtonClass = computed(() => {
  const classes: Record<string, string> = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-info',
    primary: 'btn-primary',
  }
  return classes[props.variant] || 'btn-danger'
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  if (!loading.value) {
    emit('update:modelValue', false)
    emit('cancel')
  }
}
</script>

<style scoped lang="scss">
.confirm-dialog-body {
  display: flex;
  gap: 16px;
  align-items: start;
}

.icon-container {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &.icon-danger {
    background-color: #fef2f2;
  }

  &.icon-warning {
    background-color: #fffbeb;
  }

  &.icon-info {
    background-color: #eff6ff;
  }

  &.icon-primary {
    background-color: #eff6ff;
  }

  .icon {
    font-size: 24px;
  }
}

.message-container {
  flex: 1;
}

.message {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 500;
  color: #1f2937;
}

.description {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
