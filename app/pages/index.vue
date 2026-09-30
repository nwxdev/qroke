<script setup lang="ts">
const route = useRoute()
const access = await useRequestFetch()<{ authorized: boolean }>('/api/access', {
  timeout: 4000,
}).catch(() => ({ authorized: false }))
if (access.authorized)
  await navigateTo(
    { path: '/busca', query: route.query, hash: route.hash },
    { external: true, replace: true, redirectCode: 302 },
  )
</script>
<template><PartyEntry /></template>
