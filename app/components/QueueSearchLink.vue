<script setup lang="ts">
const partyRoute = usePartyRoute()
const route = useRoute()
function focusSearch() {
  if (partyRoute.page.value !== '/busca') return
  requestAnimationFrame(() => {
    const target = document.getElementById('busca')
    target?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
    target?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  })
}
</script>
<template>
  <PartyLink to="/busca#busca" class="primary-button queue-search-target" @click="focusSearch"
    ><AppIcon name="search" /> Buscar músicas</PartyLink
  >
</template>
<style scoped>
.queue-search-target {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  min-height: 44px;
}
</style>
