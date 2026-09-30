<script setup lang="ts">
const { state, clockOffset } = useParty()
const { id } = usePartyRoute()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
const remaining = computed(() => {
  if (!state.value?.party?.expiresAt) return 'Festa original'
  const minutes = Math.max(
    0,
    Math.ceil((state.value.party.expiresAt - now.value - clockOffset.value) / 60000),
  )
  return minutes >= 60
    ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'min restantes'
    : minutes + 'min restantes'
})
</script>
<template>
  <div v-if="id && state?.party" class="party-session-banner">
    <div>
      <strong>{{ state.party.name }}</strong
      ><span>{{ remaining }}</span>
    </div>
    <a href="/">Suas festas</a>
  </div>
</template>
<style scoped>
.party-session-banner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 12px 5%;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.party-session-banner div {
  min-width: 0;
  display: flex;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}
.party-session-banner strong {
  overflow-wrap: anywhere;
}
.party-session-banner span,
.party-session-banner a {
  font-size: 12px;
  color: var(--muted);
}
.party-session-banner a {
  flex-shrink: 0;
  padding-block: 8px;
  text-decoration: underline;
}
</style>
