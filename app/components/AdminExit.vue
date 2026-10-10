<script setup lang="ts">
const { admin, pending, act, api, managed } = useParty()
</script>
<template>
  <button
    v-if="admin && !managed"
    class="header-control admin-exit"
    :disabled="pending"
    @click="act(() => api('/api/auth', { action: 'logout' }))"
  >
    <AppIcon name="exit" /> Sair do admin
  </button>
</template>
<style scoped>
.admin-exit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  white-space: nowrap;
}
</style>
