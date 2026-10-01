<script setup lang="ts">
useSiteSeo()
const route = useRoute()
const { id, page } = usePartyRoute()
const theme = useTheme()
const active = computed(() => ['/busca', '/host', '/player', '/qr', '/tv'].includes(page.value))
watch(
  () => route.path,
  () => theme.apply(),
  { flush: 'post' },
)
</script>
<template>
  <PwaInstall />
  <JoinPartyDialog :key="'join:' + id" />
  <PartySessionBanner v-if="active" :key="'banner:' + id" /><NuxtPage /><PartyRuntime
    v-if="active"
    :key="id || 'legacy'"
  />
</template>
