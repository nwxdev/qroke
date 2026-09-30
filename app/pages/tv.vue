<script setup lang="ts">
const { href } = usePartyRoute()
await navigateTo(href('/player'), { replace: true, redirectCode: 302 })
</script>
<template><div /></template>
