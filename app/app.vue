<script setup lang="ts">
useSiteSeo()
usePartyConnection()
const route = useRoute()
const theme = useTheme()
watch(
  () => route.path,
  () => theme.apply(),
  { flush: 'post' },
)
</script>
<template><NuxtPage /><PartyAlerts /></template>
