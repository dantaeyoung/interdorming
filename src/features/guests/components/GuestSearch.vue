<template>
  <div class="guest-search">
    <input
      v-model="searchQuery"
      type="text"
      class="form-input"
      :placeholder="placeholder"
      @input="handleSearch"
    />
    <button
      v-if="searchQuery"
      class="btn-clear"
      @click="clearSearch"
      title="Clear search"
    >
      &times;
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGuestStore } from '@/stores/guestStore'

interface Props {
  placeholder?: string
  scrollContainer?: string // CSS selector for the scrollable container to save/restore position
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search guests...',
  scrollContainer: '.guest-table-container',
})

const guestStore = useGuestStore()
const searchQuery = ref(guestStore.searchQuery)

function getScrollEl(): HTMLElement | null {
  return document.querySelector(props.scrollContainer)
}

function handleSearch() {
  // Save scroll position when first character is typed
  if (searchQuery.value.length === 1 && !guestStore.searchQuery) {
    const el = getScrollEl()
    if (el) {
      guestStore.savedScrollTop = el.scrollTop
    }
  }
  guestStore.setSearchQuery(searchQuery.value)
}

function clearSearch() {
  searchQuery.value = ''
  guestStore.setSearchQuery('')
  // Restore scroll position after DOM updates
  nextTick(() => {
    const el = getScrollEl()
    if (el && guestStore.savedScrollTop > 0) {
      el.scrollTop = guestStore.savedScrollTop
      guestStore.savedScrollTop = 0
    }
  })
}

// Sync with store if changed externally
watch(
  () => guestStore.searchQuery,
  newValue => {
    if (newValue !== searchQuery.value) {
      searchQuery.value = newValue
    }
  }
)
</script>

<style scoped lang="scss">
.guest-search {
  width: 100%;
  position: relative;
}

.btn-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: #9ca3af;
  padding: 2px 6px;
  line-height: 1;

  &:hover {
    color: #4b5563;
  }
}

.form-input {
  width: 100%;
  padding: 8px 30px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}
</style>
