<template>
  <div class="guest-search">
    <input
      v-model="searchQuery"
      type="text"
      class="form-input"
      :placeholder="placeholder"
      @input="handleSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGuestStore } from '@/stores/guestStore'

interface Props {
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search guests...',
})

const guestStore = useGuestStore()
const searchQuery = ref(guestStore.searchQuery)

function handleSearch() {
  guestStore.setSearchQuery(searchQuery.value)
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
}

.form-input {
  width: 100%;
  padding: 8px 12px;
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
