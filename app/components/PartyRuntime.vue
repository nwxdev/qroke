<script setup lang="ts">
usePartyConnection()
const { state, clockOffset } = useParty()
const { href } = usePartyRoute()
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    const expires = state.value?.party?.expiresAt
    if (expires && Date.now() + clockOffset.value >= expires) location.replace(href('/encerrada'))
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
<template><PartyAlerts /></template>
