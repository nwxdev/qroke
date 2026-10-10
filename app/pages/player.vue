<script setup lang="ts">
const { state, queue, isPlayer } = useParty()
const route = useRoute()
const cinema = useState('qroke:karaoke-cinema', () => false)
const stageDismissed = ref(false)
const fullscreen = ref(false)
const fullscreenHint = ref('')
const stageButton = ref<HTMLButtonElement | null>(null)
function syncFullscreen() {
  fullscreen.value = !!document.fullscreenElement
}
async function enterFullscreen() {
  stageDismissed.value = false
  fullscreenHint.value = ''
  if (document.fullscreenElement) return
  try {
    if (!document.documentElement.requestFullscreen) throw new Error('unsupported')
    await document.documentElement.requestFullscreen()
  } catch {
    fullscreenHint.value = 'Toque em Tela cheia na TV para ampliar o palco.'
  }
}
async function exitStage() {
  stageDismissed.value = true
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
}
function activateStage() {
  window.dispatchEvent(new Event('qroke:activate-media'))
}
function activatePresentation() {
  void enterFullscreen()
}
watch(
  () => state.value?.current?.queueId,
  async () => {
    stageDismissed.value = false
    if (!karaoke.value) return
    await nextTick()
    window.scrollTo(0, 0)
    if (!document.fullscreenElement) void enterFullscreen()
  },
)
onMounted(() => {
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
  window.addEventListener('qroke:activate-media', activatePresentation)
})
onBeforeUnmount(() => {
  cinema.value = false
  document.removeEventListener('fullscreenchange', syncFullscreen)
  window.removeEventListener('qroke:activate-media', activatePresentation)
})
const root = ref<HTMLElement | null>(null)
const { active: soundActive } = usePlayerSound()
const { waiting: karaokeWaiting } = useKaraokeCountdown()
const karaoke = computed(() => !!state.value?.current?.karaoke)
watchEffect(() => {
  cinema.value = karaoke.value && !stageDismissed.value
})
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
  if (cinema.value) {
    void exitStage()
    return
  }
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
      '--player-footer-space': '20px',
    }"
    :class="{
      'karaoke-expanded': expanded,
      'karaoke-cinema': cinema,
      'karaoke-preparing': karaokeWaiting,
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
      <PartyBrand class="player-brand" />
      <HeaderMenu player-controls>
        <template #controls>
          <button
            type="button"
            class="icon-button player-fullscreen"
            :aria-label="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
            :title="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
            @click="fullscreen ? exitStage() : activateStage()"
          >
            <AppIcon :name="fullscreen ? 'fullscreen-exit' : 'fullscreen'" />
          </button>
        </template>
      </HeaderMenu>
    </header>
    <div v-if="cinema" class="stage-actions" :class="{ 'in-cinema': cinema }">
      <button ref="stageButton" type="button" @click="fullscreen ? exitStage() : activateStage()">
        {{ fullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}
      </button>
      <button v-if="cinema" type="button" @click="exitStage">Sair do palco</button>
      <DismissibleNotice
        v-if="fullscreenHint && !fullscreen"
        :message="fullscreenHint"
        role="status"
        @close="fullscreenHint = ''"
      />
    </div>
    <DismissibleNotice
      v-if="fullscreenHint && !cinema"
      :message="fullscreenHint"
      role="status"
      @close="fullscreenHint = ''"
    />
    <div class="tv-stage">
      <section class="tv-main">
        <KaraokeCountdown :embedded="!cinema" />
        <PlayerStage />
        <PlayerBackgroundHelp />
        <details v-if="!karaoke" class="player-discovery">
          <summary><AppIcon name="search" /> Buscar música</summary>
          <MusicSearch :allow-karaoke="false" embedded />
        </details>
        <PartyLink v-if="karaoke" to="/busca?karaoke=1#busca" class="karaoke-search-link"
          >Buscar karaokê ↗</PartyLink
        >
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
        <PartyNotice />
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
          <QrCode
            presentation
            :fullscreen-caption="karaoke && cinema && fullscreen"
            :large="musicMode"
            :class="{ 'karaoke-qr': karaoke }"
          />
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
.tv-screen {
  --player-header-space: 76px;
  --player-footer-space: 8px;
  box-sizing: border-box;
  height: 100dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--player-header-space) clamp(12px, 3vw, 40px) max(12px, env(safe-area-inset-bottom));
  overflow: hidden;
}
.player-header {
  container: party-header / inline-size;
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 64px;
  min-height: 0;
  padding: 6px clamp(12px, 3vw, 40px);
  margin: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.player-brand {
  flex: 1;
  min-width: 0;
}
.player-fullscreen {
  display: grid;
  place-items: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
}
.tv-stage,
.tv-screen.music-mode .tv-stage,
.tv-screen.karaoke-expanded .tv-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(220px, 28vw, 330px);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(16px, 2vw, 28px);
  flex: 1;
  min-height: 0;
  align-items: stretch;
}
.tv-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.tv-main :deep(.player-stage) {
  flex: 1;
  min-height: 264px;
  aspect-ratio: auto;
}
.tv-aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.tv-aside > :deep(.notice) {
  flex-shrink: 0;
  font-size: 12px;
  margin: 0;
  padding: 12px;
}
.player-invite {
  order: -1;
  flex-shrink: 0;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: center;
}
.player-invite h1 {
  font-size: clamp(20px, 2vw, 28px);
  line-height: 1.1;
  margin: 8px 0 12px;
}
.player-invite h1 em {
  color: var(--accent);
  font-style: normal;
}
.video-invite-heading h2 {
  font-size: 14px;
  margin: 6px 0 10px;
}
.player-invite .eyebrow {
  font-size: 9px;
}
.tv-screen .player-invite :deep(.qr-card) {
  display: block;
  position: static;
  width: 100%;
  margin: 0;
}
.tv-screen .player-invite :deep(.qr-plate) {
  width: min(160px, 22dvh, 100%);
  margin: 0 auto;
}
.player-invite :deep(.invite-brand),
.player-invite :deep(.invite-link) {
  display: none;
}
.player-invite :deep(.qr-network) {
  margin-top: 8px;
  gap: 4px;
}
.player-invite :deep(.qr-actions) {
  gap: 4px;
}
.player-invite :deep(.qr-actions button) {
  min-height: 36px;
  padding: 5px 7px;
}
.player-queue {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 120px;
  flex: 1;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  overflow: hidden;
}
.player-queue .section-heading {
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.player-queue h2 {
  font-size: 17px;
}
.player-queue > :deep(.player-queue-cards),
.player-queue :deep(.queue-list) {
  min-height: 0;
  max-height: none;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
}
.qr-current {
  flex-shrink: 0;
  overflow-wrap: anywhere;
}
.qr-current h3 {
  font-size: 15px;
}
.qr-current p {
  font-size: 12px;
}
.tv-placeholder {
  order: -1;
  flex: 1;
  min-height: 180px;
  padding: 20px;
  border-radius: var(--radius-card);
  background: var(--surface);
}
.tv-placeholder h1 {
  font-size: clamp(22px, 3vw, 40px);
  margin: 12px 0;
  overflow-wrap: anywhere;
}
.tv-placeholder p {
  font-size: 16px;
  margin: 0;
}
.tv-placeholder small {
  margin-top: 12px;
  font-size: 12px;
}
.tv-placeholder .vinyl {
  display: none;
}
.player-discovery {
  flex-shrink: 0;
  margin-top: 10px;
  min-width: 0;
}
.player-discovery > summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 44px;
  color: var(--accent);
  cursor: pointer;
}
.player-discovery[open] {
  max-height: 40dvh;
  overflow: auto;
}
.karaoke-search-link {
  flex-shrink: 0;
  padding: 10px 0;
  color: var(--accent);
  font-size: 13px;
}
.tv-main:has(.karaoke-countdown) {
  display: grid;
  grid-template-rows: minmax(264px, 1fr) auto;
}
.tv-main :deep(.karaoke-countdown),
.tv-main:has(.karaoke-countdown) :deep(.player-stage) {
  grid-area: 1 / 1;
  margin: 0;
  min-height: 0;
}
.tv-main :deep(.karaoke-countdown) {
  z-index: 35;
  overflow: auto;
}
.tv-main:has(.karaoke-countdown) .karaoke-search-link {
  grid-area: 2 / 1;
}
.next-strip {
  flex-shrink: 0;
  margin-top: 8px;
  padding-top: 8px;
  gap: 12px;
  max-height: 90px;
}
.next-card {
  padding: 8px;
}
.stage-actions {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 45;
  width: calc(var(--qroke-stage-rail) - 24px);
  display: grid;
  gap: 8px;
}
.stage-actions button {
  min-height: 44px;
  padding: 8px 6px;
  font-size: 12px;
  background: var(--player-bg);
  color: var(--player-text);
  border-color: var(--player-frame-line);
}
.stage-actions :deep(.notice) {
  font-size: 11px;
}
.tv-screen.karaoke-preparing {
  isolation: auto;
}
.tv-screen.karaoke-cinema {
  isolation: auto;
  --qroke-stage-rail: clamp(112px, 16vw, 210px);
  --karaoke-qr-width: calc(var(--qroke-stage-rail) - 24px);
  display: block;
  height: 100dvh;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
.karaoke-cinema .player-header,
.karaoke-cinema .player-queue,
.karaoke-cinema .karaoke-search-link,
.karaoke-cinema .next-strip,
.karaoke-cinema :deep(.background-help),
.karaoke-cinema .tv-aside > :deep(.notice) {
  display: none;
}
.tv-screen.karaoke-cinema .tv-stage {
  display: block;
  height: 100%;
  margin: 0;
}
.karaoke-cinema .tv-main {
  display: block;
  height: 100%;
  overflow: hidden;
}
.karaoke-cinema .tv-main :deep(.player-stage) {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  aspect-ratio: auto;
}
.karaoke-cinema .tv-main :deep(.countdown-fullscreen) {
  position: fixed;
  inset: 0;
  height: 100dvh;
}
.karaoke-cinema .player-invite {
  position: fixed;
  z-index: 40;
  right: 12px;
  bottom: max(48px, calc(env(safe-area-inset-bottom) + 12px));
  width: calc(var(--qroke-stage-rail) - 24px);
  padding: 0;
  border: 0;
  background: transparent;
}
.tv-screen.karaoke-cinema .player-invite :deep(.qr-plate) {
  width: 100%;
  margin: 0;
}
.karaoke-cinema :deep(.qr-network) {
  display: none;
}
.karaoke-cinema :deep(.countdown-fullscreen) {
  --qroke-stage-rail: clamp(112px, 16vw, 210px);
}
@media (max-width: 900px) and (orientation: portrait) and (min-height: 481px) {
  .tv-screen {
    --player-header-space: 72px;
    padding-inline: 12px;
    padding-bottom: 8px;
  }
  .tv-stage,
  .tv-screen.music-mode .tv-stage,
  .tv-screen.karaoke-expanded .tv-stage {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(264px, 1.2fr) minmax(150px, 1fr);
    gap: 12px;
  }
  .tv-aside {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(120px, 0.75fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 10px;
    overflow: hidden;
  }
  .tv-aside > :deep(.notice) {
    display: none;
  }
  .player-queue {
    min-height: 0;
    padding: 10px;
  }
  .player-queue h2 {
    font-size: 14px;
  }
  .player-invite {
    grid-column: 2;
    grid-row: 1;
    padding: 8px;
    overflow: auto;
  }
  .player-invite h1,
  .video-invite-heading,
  .player-invite > .eyebrow {
    display: none;
  }
  .tv-screen .player-invite :deep(.qr-plate) {
    width: min(clamp(120px, 20vw, 190px), 100%);
  }
  .player-invite :deep(.qr-actions) {
    flex-direction: column;
  }
  .tv-screen.karaoke-cinema .tv-stage {
    display: block;
  }
  .karaoke-cinema .tv-aside {
    display: contents;
  }
  .next-strip {
    display: none;
  }
  .tv-placeholder {
    padding: 12px;
    min-height: 0;
  }
  .tv-placeholder h1 {
    font-size: 24px;
  }
  .player-discovery {
    margin-top: 4px;
  }
}
@media (max-height: 480px) {
  .tv-screen {
    --player-header-space: 60px;
    padding: 60px 12px 4px;
  }
  .player-header {
    height: 56px;
    padding-block: 4px;
  }
  .tv-stage,
  .tv-screen.music-mode .tv-stage,
  .tv-screen.karaoke-expanded .tv-stage {
    grid-template-columns: minmax(200px, 1fr) 210px;
    gap: 12px;
  }
  .tv-main :deep(.player-stage) {
    min-height: 256px;
  }
  .player-discovery,
  .karaoke-search-link,
  .next-strip {
    display: none;
  }
  .player-invite {
    padding: 8px;
  }
  .player-invite h1,
  .video-invite-heading,
  .player-invite > .eyebrow {
    display: none;
  }
  .tv-screen .player-invite :deep(.qr-plate) {
    width: 100px;
  }
  .player-queue {
    min-height: 120px;
  }
  .tv-screen.karaoke-cinema {
    padding: 0;
  }
}
@media (max-width: 500px) {
  .stage-actions {
    top: 8px;
    right: 8px;
    width: calc(var(--qroke-stage-rail) - 16px);
  }
  .stage-actions button {
    font-size: 11px;
  }
}
</style>
