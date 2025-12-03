<template>
  <Transition name="fade">
    <div v-if="visible" :class="['status-message', `status-${type}`]">
      <span class="status-icon">{{ icon }}</span>
      <span class="status-text">{{ message }}</span>
      <button class="status-close" @click="close">×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 5000,
  modelValue: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const visible = ref(props.modelValue)
let timeout: ReturnType<typeof setTimeout> | null = null

const icon = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}[props.type]

watch(
  () => props.modelValue,
  newValue => {
    visible.value = newValue
    if (newValue && props.duration > 0) {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        close()
      }, props.duration)
    }
  },
  { immediate: true }
)

function close() {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
  if (timeout) clearTimeout(timeout)
}
</script>

<style scoped lang="scss">
.status-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 16px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;

  &.status-success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  &.status-error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  &.status-warning {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  &.status-info {
    background-color: #dbeafe;
    color: #1e40af;
    border: 1px solid #bfdbfe;
  }
}

.status-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.status-text {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
