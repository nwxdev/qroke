<script setup lang="ts">
const { state } = useParty()
const { waiting, remaining } = useKaraokeCountdown()
</script>
<template>
  <section
    v-if="waiting && state?.current"
    class="karaoke-countdown"
    aria-label="Preparação do karaokê"
  >
    <span class="eyebrow">{{ state.paused ? 'PREPARAÇÃO EM PAUSA' : 'PREPAREM O MICROFONE' }}</span>
    <div class="countdown-number" aria-hidden="true">{{ remaining }}</div>
    <p role="status">
      {{ state.karaokeStartsAt ? 'A música vai começar' : 'Aguardando o PLAYER ativar o som' }}
    </p>
    <h1>{{ state.current.title }}</h1>
    <KaraokeSingers :people="state.current.singers" :fallback="state.current.guestName" />
    <p>É a vez de vocês. Posicionem-se para cantar!</p>
  </section>
</template>
<style scoped>
.karaoke-countdown {
  display: grid;
  justify-items: center;
  text-align: center;
  padding: clamp(16px, 4vw, 40px);
  border: 1px solid var(--accent);
  border-radius: 24px;
  background: var(--surface);
  margin-bottom: 20px;
  overflow-wrap: anywhere;
}
.countdown-number {
  font-size: clamp(90px, 14vw, 180px);
  line-height: 1;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.karaoke-countdown h1 {
  font-size: clamp(22px, 3vw, 42px);
  line-height: 1.2;
  max-width: 100%;
}
.karaoke-countdown :deep(.karaoke-singers) {
  justify-content: center;
  font-size: clamp(16px, 2vw, 26px);
}
</style>
