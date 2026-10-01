<script setup lang="ts">
useSiteSeo()
const route = useRoute()
const joinOpen = useState('qroke:join-open', () => false)
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
  <LazyJoinPartyDialog v-if="joinOpen" :key="'join:' + id" />
  <LazyPartySessionBanner v-if="active" :key="'banner:' + id" />
  <NuxtPage :transition="{ name: 'scene', mode: 'out-in' }" />
  <ClientOnly><AnalyticsConsent /></ClientOnly>
  <ClientOnly><LazyMotionFeedback v-if="active" :key="'motion:' + id" /></ClientOnly>
  <LazyPartyRuntime v-if="active" :key="id || 'legacy'" />
</template>
