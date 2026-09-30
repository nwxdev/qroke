<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()
if (import.meta.server && !config.accessRequired)
  await navigateTo(
    { path: '/busca', query: route.query, hash: route.hash },
    { external: true, replace: true, redirectCode: 302 },
  )
</script>
<template><CreateParty /></template>
