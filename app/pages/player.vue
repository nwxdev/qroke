<script setup lang="ts">
const { state, queue, isPlayer } = useParty()
const root = ref<HTMLElement | null>(null)
const mediaPlayer = ref<{ activate: () => Promise<void> } | null>(null)
const { active: soundActive } = usePlayerSound()
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
  const header = root.value?.querySelector('header')
  const trigger = header?.querySelector<HTMLButtonElement>('.menu-toggle')
  const target = trigger?.getClientRects().length
    ? trigger
    : header?.querySelector<HTMLElement>('[aria-current="page"]')
  target?.focus()
}
// Teclas de mídia não administram a festa pela tela de exibição.
useSpatialNav(root, back, () => {})
</script>
<template>
  <main
    ref="root"
    class="tv-screen"
    :style="{
      '--player-footer-space': soundActive ? '20px' : 'calc(80px + env(safe-area-inset-bottom))',
    }"
    :class="{
      'karaoke-expanded': expanded,
      'karaoke-active': karaoke,
      'music-mode': musicMode,
      'video-mode': !musicMode && !karaoke,
    }"
  >
    <div
      v-if="state?.current?.thumbnail"
      class="tv-backdrop"
      :style="{ backgroundImage: 'url(' + state.current.thumbnail + ')' }"
    />
    <header class="tv-header player-header">
      <BrandLogo class="player-brand" />
      <HeaderMenu>
        <PlayerSoundButton @activate="mediaPlayer?.activate()" />
        <template v-if="!soundActive" #persistent>
          <PlayerSoundButton @activate="mediaPlayer?.activate()" />
        </template>
      </HeaderMenu>
    </header>
    <PartyNotice />
    <div class="tv-stage">
      <section class="tv-main">
        <KaraokeCountdown />
        <MediaPlayer ref="mediaPlayer" />
        <div v-if="!isPlayer && !karaokeWaiting" class="tv-placeholder">
          <span v-if="state?.current" class="vinyl">♫</span>
          <BrandLogo v-else class="standby-brand" />
          <span class="eyebrow">{{
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
        <section class="player-queue qr-queue" aria-labelledby="player-queue-title">
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
          <div v-if="!musicMode && !karaoke" class="video-invite-heading">
            <span class="eyebrow">ENTRE NA FESTA</span>
            <h2>Escolha a próxima música</h2>
          </div>
          <QrCode presentation :large="musicMode" :class="{ 'karaoke-qr': karaoke }" />
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
            ><small v-if="!item.playlist">{{ item.guestName }}</small>
            <PlaylistBadge :playlist="item.playlist" />
            <KaraokeSingers v-if="item.karaoke" :people="item.singers" :fallback="item.guestName" />
          </div></div
      ></TransitionGroup>
    </div>
  </main>
</template>

<style scoped>
.player-brand {
  --brand-logo-width: 180px;
  justify-self: start;
}
@media (max-width: 1100px) {
  .player-brand {
    --brand-logo-width: 156px;
  }
}
@media (max-width: 380px) {
  .player-brand {
    --brand-logo-width: 146px;
  }
}

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
  --player-header-space: 98px;
  --player-footer-space: calc(80px + env(safe-area-inset-bottom));
  padding-top: var(--player-header-space);
  padding-bottom: var(--player-footer-space);
}
.player-header {
  container: party-header / inline-size;
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 5vw;
  min-height: 0;
  margin: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
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
    --player-header-space: 90px;
  }
  .player-header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
  }
}
/* O convite tem uma coluna própria com respiro em relação ao vídeo. */
.video-mode .tv-stage {
  grid-template-columns: minmax(200px, 1fr) clamp(240px, 25vw, 340px);
  gap: clamp(28px, 3.5vw, 56px);
}
.video-mode .tv-aside {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.video-mode .player-invite {
  order: -1;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
}
.video-invite-heading {
  text-align: center;
}
.video-invite-heading .eyebrow {
  justify-content: center;
}
.video-invite-heading h2 {
  margin-top: 8px;
  font-size: 17px;
}
.video-mode .player-invite :deep(.qr-card) {
  margin-top: 16px;
}
.video-mode .player-invite :deep(.qr-plate) {
  width: min(180px, 100%);
  margin: 0 auto 12px;
}
@media (max-width: 1023px) {
  .video-mode .tv-stage {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .video-mode .tv-aside {
    display: grid;
    grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
    align-items: start;
    gap: 24px;
  }
}
@media (max-width: 600px) {
  .video-mode .tv-aside {
    grid-template-columns: minmax(0, 1fr);
  }
  .video-mode .player-invite {
    width: 100%;
    max-width: 420px;
    justify-self: center;
  }
}
@media (max-width: 1023px) {
  .karaoke-active .tv-aside {
    display: contents;
  }
  .karaoke-active .tv-main {
    grid-column: 1;
    grid-row: 1;
  }
  .karaoke-active .player-queue {
    grid-column: 1;
    grid-row: 2;
    margin-top: 16px;
  }
  .karaoke-active .player-queue .section-heading {
    flex-wrap: wrap;
  }
  .karaoke-active .player-invite {
    grid-column: 2;
    grid-row: 1 / 3;
  }
}
/* Desktop/TV ocupa a janela; listas rolam dentro de seus painéis. */
@media (min-width: 1024px) {
  .tv-screen {
    height: 100dvh;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: var(--player-footer-space);
  }
  .tv-screen > :deep(.notice) {
    flex-shrink: 0;
    max-height: 15dvh;
    overflow: auto;
    margin-top: 0;
  }
  .tv-stage {
    flex: 1;
    min-height: 0;
    align-items: stretch;
  }
  .tv-main {
    min-height: 0;
    overflow: auto;
  }
  .tv-main :deep(.media-player) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 280px;
  }
  .tv-main :deep(.media-slot) {
    flex: 1;
    min-height: 200px;
  }
  .tv-main :deep(.media-shell:not(.player-floating)) {
    height: 100%;
  }
  .tv-main :deep(.media-shell:not(.player-floating) .media-viewport) {
    height: 100%;
    max-height: none;
    aspect-ratio: auto;
  }
  .tv-main :deep(.player-caption) {
    flex-shrink: 0;
    margin-bottom: 0;
  }
  .tv-main :deep(.player-caption strong) {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tv-main:has(.karaoke-countdown) :deep(.media-player) {
    height: auto;
    min-height: 0;
  }
  .tv-placeholder {
    min-height: 0;
    height: 100%;
    padding: 12px;
  }
  .tv-placeholder h1 {
    font-size: clamp(24px, 3vw, 44px);
  }
  .video-mode .tv-aside {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    overflow: auto;
    gap: 20px;
  }
  .video-mode .player-invite {
    padding: 16px;
  }
  .video-mode .player-invite :deep(.qr-plate) {
    width: min(150px, 24dvh);
  }
  .player-queue {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
  .player-queue > :deep(.player-queue-cards) {
    min-height: 0;
    max-height: none;
    flex: 1;
    overflow: auto;
  }
  .player-queue .section-heading {
    flex-shrink: 0;
    margin-bottom: 12px;
  }
  .tv-screen.music-mode .tv-stage {
    grid-template-columns: minmax(220px, 0.9fr) minmax(200px, 0.85fr) minmax(260px, 1.2fr);
    grid-template-areas: 'invite media queue';
    gap: 24px;
  }
  .music-mode .player-invite {
    min-height: 0;
    overflow: auto;
    align-self: center;
    max-height: 100%;
  }
  .music-mode .player-invite h1 {
    font-size: clamp(22px, 2.2vw, 32px);
    margin: 10px 0 14px;
  }
  .music-mode .player-invite :deep(.qr-plate) {
    width: min(190px, 100%, 27dvh);
  }
  .music-mode .tv-main {
    align-self: center;
    max-height: 100%;
  }
  .music-mode .tv-main :deep(.media-player) {
    height: auto;
    min-height: 0;
  }
  .music-mode .tv-main :deep(.media-slot) {
    flex: none;
  }
  .music-mode .tv-main :deep(.media-shell:not(.player-floating)) {
    height: auto;
  }
  .music-mode .tv-main :deep(.media-shell:not(.player-floating) .media-viewport) {
    height: auto;
    aspect-ratio: 1;
  }
  .tv-screen.karaoke-active {
    --karaoke-qr-width: clamp(240px, 24vw, 320px);
  }
  .tv-screen.karaoke-active .tv-stage {
    gap: 24px;
  }
  .karaoke-active .tv-aside {
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 16px;
  }
  .karaoke-active .player-queue {
    display: flex;
    flex: 1;
  }
  .karaoke-active .player-invite {
    flex-shrink: 0;
  }
  .tv-screen.karaoke-active .tv-aside :deep(.karaoke-qr) {
    position: relative;
    right: auto;
    bottom: auto;
    width: 100%;
    margin-top: 0;
  }
  .tv-screen.karaoke-active :deep(.karaoke-qr .qr-plate) {
    width: min(150px, 23dvh);
    margin-inline: auto;
  }
  .next-strip {
    flex-shrink: 0;
    margin-top: 16px;
    padding-top: 12px;
  }
}
.tv-screen :deep(.player-floating) {
  bottom: var(--player-footer-space);
}
@media (max-width: 1023px) {
  .tv-screen.karaoke-active .tv-aside :deep(.karaoke-qr) {
    bottom: var(--player-footer-space);
  }
}
</style>
