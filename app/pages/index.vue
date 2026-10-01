<script setup lang="ts">
import { isProductionSite } from '#shared/site'
const config = useRuntimeConfig()
const route = useRoute()
if (
  import.meta.server &&
  !config.accessRequired &&
  !isProductionSite(String(config.public.partyUrl))
)
  await navigateTo(
    { path: '/busca', query: route.query, hash: route.hash },
    { external: true, replace: true, redirectCode: 302 },
  )
</script>
<template><CreateParty /></template>
