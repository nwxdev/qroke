<script setup lang="ts">
useSiteSeo()
const route = useRoute()
const { id, page } = usePartyRoute()
const theme = useTheme()
useMotionPreference()
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
  <PartySessionBanner v-if="active" :key="'banner:' + id" />
  <NuxtPage :transition="{ name: 'scene', mode: 'out-in' }" />
  <ClientOnly><AnalyticsConsent /></ClientOnly>
  <ClientOnly><MotionFeedback :key="'motion:' + id" /></ClientOnly>
  <PartyRuntime v-if="active" :key="id || 'legacy'" />
</template>
