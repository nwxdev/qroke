<script setup lang="ts">
const route = useRoute()
await navigateTo(
  { path: '/busca', query: route.query, hash: route.hash },
  { replace: true, redirectCode: 302 },
)
</script>
<template><span /></template>
