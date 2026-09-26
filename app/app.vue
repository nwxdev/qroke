<script setup lang="ts">
usePartyConnection()
const route = useRoute()
const theme = useTheme()
watch(
  () => route.path,
  () => theme.apply(),
  { flush: 'post' },
)
</script>
<template><NuxtPage /></template>
