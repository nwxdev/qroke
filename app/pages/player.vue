<script setup lang="ts">
const { state, queue, isPlayer, device, soundDevice, connected } = useParty()
const root = ref<HTMLElement | null>(null)
const mediaPlayer = ref<{ activate: () => Promise<void> } | null>(null)
const armed = computed(() => !!device.value && soundDevice.value === device.value.id)
const soundStatus = computed(() => {
  if (!connected.value) return 'Aguardando conexão com a festa.'
  if (!armed.value) return 'Permita o áudio neste navegador.'
  return isPlayer.value
    ? 'Som ativado nesta tela.'
    : 'Som autorizado. Aguardando o anfitrião escolher este aparelho.'
})
const { waiting: karaokeWaiting } = useKaraokeCountdown()
const karaoke = computed(() => !!state.value?.current?.karaoke)
const musicMode = computed(
  () =>
    !karaoke.value &&
    (state.value?.mode === 'music' ||
      state.value?.current?.source === 'local' ||
      !state.value?.current),
)
const closing = computed(
  () => !!state.value?.duration && state.value.duration - state.value.position <= 5,
)
const expanded = computed(() => karaoke.value && !closing.value)
function back() {
  root.value?.querySelector<HTMLButtonElement>('.screen-sound-button')?.focus()
}
// Teclas de mídia não administram a festa pela tela de exibição.
useSpatialNav(root, back, () => {})
</script>
<template>
  <main
    ref="root"
    class="tv-screen"
    :class="{
      'karaoke-expanded': expanded,
      'karaoke-active': karaoke,
      'music-mode': musicMode,
    }"
  >
    <div
      v-if="state?.current?.thumbnail"
      class="tv-backdrop"
      :style="{ backgroundImage: 'url(' + state.current.thumbnail + ')' }"
    />
    <header class="tv-header player-header">
      <span class="brand"><span class="brand-mark">q</span> QRokê</span>
      <div class="screen-sound">
        <button
          class="primary-button screen-sound-button"
          :disabled="!device"
          aria-describedby="screen-sound-status"
          @click="mediaPlayer?.activate()"
        >
          <AppIcon name="volume" /> ATIVAR SOM NESTA TELA
        </button>
        <small id="screen-sound-status" role="status">{{ soundStatus }}</small>
      </div>
      <div class="screen-theme">
        <NuxtLink to="/host" class="player-host-link" aria-label="Anfitrião">
          <AppIcon name="person" /><span>Anfitrião</span>
        </NuxtLink>
        <ThemeToggle />
      </div>
    </header>
    <PartyNotice />
    <div class="tv-stage">
      <section class="tv-main">
        <KaraokeCountdown />
        <MediaPlayer ref="mediaPlayer" />
        <div v-if="!isPlayer && !karaokeWaiting" class="tv-placeholder">
          <span class="vinyl">♫</span
          ><span class="eyebrow">{{
            state?.current ? 'TOCANDO NA FESTA' : 'A NOITE COMEÇA AQUI'
          }}</span>
          <h1>{{ state?.current?.title || 'Toda festa tem uma trilha.' }}</h1>
          <p>{{ state?.current?.artist || 'Escaneie o QR e escolha a primeira música.' }}</p>
          <small>{{
            state?.current
              ? 'Reprodução no dispositivo PLAYER selecionado.'
              : 'Selecione o PLAYER nos controles do anfitrião.'
          }}</small>
        </div>
      </section>
      <aside class="tv-aside">
        <section
          v-show="!karaoke"
          class="player-queue qr-queue"
          aria-labelledby="player-queue-title"
        >
          <div class="section-heading">
            <h2 id="player-queue-title">Fila da festa</h2>
            <span>{{ queue.length }} faixas</span>
          </div>
          <div v-if="musicMode && state?.current" class="qr-current">
            <span class="eyebrow">{{ state.paused ? 'EM PAUSA' : 'AGORA NA FESTA' }}</span>
            <h3>{{ state.current.title }}</h3>
            <p>{{ state.current.artist }} · {{ state.current.guestName }}</p>
            <PlaylistBadge :playlist="state.current.playlist" />
          </div>
          <PlayerQueue :compact="!musicMode" />
        </section>
        <section class="player-invite qr-invite">
          <template v-if="musicMode"
            ><span class="eyebrow">TODO MUNDO É DJ</span>
            <h1>Aponte a câmera.<br /><em>Entre na festa.</em></h1></template
          >
          <QrCode :large="musicMode" :class="{ 'karaoke-qr': karaoke }" />
        </section>
      </aside>
    </div>
    <div v-if="!musicMode && !expanded && queue.length" class="next-strip">
      <span class="eyebrow">PRÓXIMAS 3</span
      ><TransitionGroup name="next" tag="div" class="next-cards"
        ><div v-for="(item, index) in queue.slice(0, 3)" :key="item.queueId" class="next-card">
          <span>{{ index + 1 }}</span>
          <div>
            <strong>{{ item.title }}</strong
            ><small>{{ item.guestName }}</small>
            <PlaylistBadge :playlist="item.playlist" />
            <KaraokeSingers v-if="item.karaoke" :people="item.singers" :fallback="item.guestName" />
          </div></div
      ></TransitionGroup>
    </div>
  </main>
</template>

<style scoped>
.tv-screen .player-invite :deep(.qr-card) {
  display: block;
}
.player-invite {
  min-width: 0;
}
.player-invite h1 {
  font-size: clamp(28px, 3vw, 46px);
  line-height: 1.15;
  margin: 16px 0 24px;
}
.player-invite h1 em {
  color: var(--accent);
  font-style: normal;
}
.player-queue {
  min-width: 0;
}
.player-invite :deep(.qr-card) {
  margin-top: 20px;
}
.tv-screen.music-mode .tv-stage {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: 'invite queue' 'media queue';
  gap: 24px 40px;
}
.music-mode .tv-main {
  grid-area: media;
}
.music-mode .tv-aside {
  display: contents;
}
.music-mode .player-invite {
  grid-area: invite;
  text-align: center;
}
.music-mode .player-queue {
  grid-area: queue;
  padding: clamp(16px, 3vw, 30px);
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
}
.music-mode .player-invite :deep(.qr-plate) {
  width: min(300px, 100%);
}
.music-mode .player-queue :deep(.queue-list) {
  max-height: 65vh;
  overflow-y: auto;
}
.music-mode :deep(.media-shell) {
  max-width: 320px;
  margin-inline: auto;
}
.music-mode :deep(.player-floating) {
  margin-inline: 0;
}
.music-mode :deep(.player-caption) {
  text-align: center;
}
.music-mode .tv-placeholder {
  min-height: 140px;
}
.music-mode .tv-placeholder .vinyl {
  display: none;
}
.music-mode .tv-placeholder h1 {
  font-size: 24px;
}
.music-mode .qr-current {
  overflow-wrap: anywhere;
}
.tv-screen {
  padding-top: 130px;
}
.player-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 5vw;
  margin: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.screen-sound {
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 0;
}
.screen-sound-button {
  min-height: 48px;
  white-space: nowrap;
}
.tv-screen .screen-sound-button:focus {
  transform: none;
}
.screen-sound small {
  text-align: center;
  font-size: 12px;
  line-height: 16px;
  max-width: 310px;
  min-height: 32px;
}
.screen-theme {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}
.player-host-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}
@media (max-width: 380px) {
  .player-host-link {
    padding: 10px;
  }
  .player-host-link span {
    display: none;
  }
}
@media (max-width: 760px) {
  .tv-screen.music-mode .tv-stage {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'invite' 'media' 'queue';
    gap: 24px;
  }
  .music-mode .player-queue :deep(.queue-list) {
    max-height: 460px;
  }
  .tv-screen {
    padding-top: 192px;
  }
  .player-header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
  .screen-sound {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .screen-sound-button {
    font-size: 12px;
    width: 100%;
    max-width: 360px;
  }
  .screen-theme {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
