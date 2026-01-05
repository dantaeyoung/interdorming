<template>
  <div class="empty-state">
    <div class="empty-icon" v-if="icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-message" v-if="message">{{ message }}</p>
    <div class="empty-actions" v-if="$slots.actions || primaryAction">
      <slot name="actions">
        <button
          v-if="primaryAction"
          class="empty-btn empty-btn-primary"
          @click="$emit('primary-action')"
        >
          {{ primaryAction }}
        </button>
        <button
          v-if="secondaryAction"
          class="empty-btn empty-btn-secondary"
          @click="$emit('secondary-action')"
        >
          {{ secondaryAction }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  message?: string
  primaryAction?: string
  secondaryAction?: string
}>()

defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 200px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.empty-message {
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: #6b7280;
  max-width: 300px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &.empty-btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  &.empty-btn-secondary {
    background: white;
    color: #4f46e5;
    border: 1px solid #c7d2fe;

    &:hover {
      background: #f5f3ff;
    }
  }
}
</style>
