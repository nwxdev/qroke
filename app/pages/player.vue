<script setup lang="ts">
const { state, admin, queue, isPlayer, control, device, pending, playHere } = useParty()
const root = ref<HTMLElement | null>(null),
  unlock = ref(false),
  controls = ref(false)
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
const expanded = computed(() => karaoke.value && !closing.value && !controls.value && !unlock.value)
function back() {
  if (unlock.value) unlock.value = false
  else controls.value = false
  nextTick(() => root.value?.querySelector<HTMLButtonElement>('.tv-menu-button')?.focus())
}
function media(action: 'pause' | 'skip') {
  if (!admin.value) {
    unlock.value = true
    return
  }
  void control(
    action === 'pause' ? { action: 'pause', paused: !state.value?.paused } : { action: 'skip' },
  )
}
useSpatialNav(root, back, media)
watch(admin, (value) => {
  if (value) unlock.value = false
})
</script>
<template>
  <main
    ref="root"
    class="tv-screen"
    :class="{
      'karaoke-expanded': expanded,
      'karaoke-active': karaoke,
      'controls-open': controls || unlock,
      'music-mode': musicMode,
    }"
  >
    <div
      v-if="state?.current?.thumbnail"
      class="tv-backdrop"
      :style="{ backgroundImage: 'url(' + state.current.thumbnail + ')' }"
    />
    <header class="tv-header">
      <span class="brand"><span class="brand-mark">q</span> QRokê</span>
      <div class="header-links">
        <span class="tag" v-if="karaoke">KARAOKÊ</span
        ><span v-if="admin" class="tag active">Admin liberado</span
        ><button
          class="tv-menu-button"
          :aria-expanded="controls"
          @click="admin ? (controls = !controls) : (unlock = !unlock)"
        >
          <AppIcon :name="admin ? 'unlock' : 'lock'" /><span>{{
            admin ? 'Controles' : 'Liberar controles'
          }}</span></button
        ><AdminExit /><NuxtLink to="/host" class="header-control"
          ><AppIcon name="person" /> Anfitrião</NuxtLink
        ><ThemeToggle />
      </div>
    </header>
    <PartyNotice />
    <div class="tv-stage">
      <section class="tv-main">
        <KaraokeCountdown />
        <MediaPlayer v-if="isPlayer" />
        <div v-else-if="!karaokeWaiting" class="tv-placeholder">
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
          <button
            v-if="!state?.playerId && admin"
            class="primary-button"
            :disabled="pending || !device"
            @click="playHere"
          >
            Tocar neste dispositivo
          </button>
          <button v-else-if="!state?.playerId" class="primary-button" @click="unlock = true">
            Ativar som nesta TV
          </button>
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
          <PlayerQueue :manage="admin && controls" :compact="!musicMode" />
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
    <AdminDialog v-model="unlock" tv />
    <section v-if="admin && controls" class="tv-control-shelf"><HostControls tv /></section>
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
.tv-header .header-links {
  flex-wrap: wrap;
}
.header-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
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
  .tv-header {
    flex-wrap: wrap;
  }
  .tv-header .header-links {
    justify-content: flex-start;
    width: 100%;
    gap: 8px;
  }
  .header-control {
    font-size: 12px;
    padding: 8px 10px;
  }
}
</style>
