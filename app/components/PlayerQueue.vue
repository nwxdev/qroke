<script setup lang="ts">
defineProps<{ compact?: boolean }>()
const { queue, state } = useParty()
const groups = computed(() => {
  const karaokeFirst = state.value?.current?.karaoke || queue.value[0]?.karaoke
  return (karaokeFirst ? [true, false] : [false, true])
    .map((karaoke) => ({
      karaoke,
      tracks: queue.value.filter((item) => item.karaoke === karaoke),
      current: state.value?.current?.karaoke === karaoke ? state.value.current : null,
    }))
    .filter((group) => group.tracks.length || group.current?.playlist)
})
</script>
<template>
  <div class="player-queue-cards">
    <template v-for="group in groups" :key="String(group.karaoke)">
      <section v-if="group.karaoke" class="player-karaoke-group" aria-label="Fila de karaokê">
        <header class="karaoke-queue-heading">
          <AppIcon name="microphone" />
          <div>
            <h3>Karaokê</h3>
            <small
              >{{ group.tracks.length }} na fila{{
                queue[0]?.karaoke ? ' · prioridade agora' : ''
              }}</small
            >
          </div>
        </header>
        <PlayerQueueItems :items="group.tracks" :current="group.current" :compact="compact" />
      </section>
      <PlayerQueueItems v-else :items="group.tracks" :current="group.current" :compact="compact" />
    </template>
    <QueueList v-if="!queue.length" :items="[]" />
  </div>
</template>
<style scoped>
.player-queue-cards {
  display: grid;
  align-content: start;
  gap: 12px;
  max-height: 65vh;
  overflow: auto;
  padding: 4px;
}
.player-karaoke-group {
  border: 1px solid var(--coral);
  border-left-width: 4px;
  border-radius: 16px;
  padding: 14px;
  min-width: 0;
  background: color-mix(in srgb, var(--brand-orange) 7%, var(--surface));
}
.karaoke-queue-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--coral);
  margin-bottom: 14px;
}
.karaoke-queue-heading h3 {
  color: var(--coral);
  font-size: 18px;
}
.karaoke-queue-heading small {
  display: block;
}
.player-karaoke-group :deep(.player-playlist-card) {
  padding: 10px;
}
</style>
