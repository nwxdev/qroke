<script setup lang="ts">
const { state, admin, queue, isPlayer, control, device, pending, playHere } = useParty()
const root = ref<HTMLElement | null>(null),
  unlock = ref(false),
  showQr = ref(true),
  controls = ref(false)
const karaoke = computed(() => !!state.value?.current?.karaoke)
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
      'music-mode': state?.mode === 'music' && !karaoke,
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
        ><button v-if="!karaoke" @click="showQr = !showQr">
          <AppIcon name="qr" /><span>{{ showQr ? 'Ocultar QR' : 'Mostrar QR' }}</span></button
        ><ThemeToggle />
      </div>
    </header>
    <PartyNotice />
    <div class="tv-stage">
      <section class="tv-main">
        <MediaPlayer v-if="isPlayer" />
        <div v-else class="tv-placeholder">
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
      <aside v-if="karaoke || !expanded" class="tv-aside">
        <template v-if="!karaoke">
          <div class="section-heading">
            <h2>A seguir</h2>
            <span>{{ queue.length }} faixas</span>
          </div>
          <QueueList :manage="admin && controls" compact /><QrCode v-if="showQr" /> </template
        ><QrCode v-else class="karaoke-qr" />
      </aside>
    </div>
    <AdminDialog v-model="unlock" tv />
    <section v-if="admin && controls" class="tv-control-shelf"><HostControls tv /></section>
    <div v-if="!expanded && queue.length" class="next-strip">
      <span class="eyebrow">PRÓXIMAS 3</span
      ><TransitionGroup name="next" tag="div" class="next-cards"
        ><div v-for="(item, index) in queue.slice(0, 3)" :key="item.queueId" class="next-card">
          <span>{{ index + 1 }}</span>
          <div>
            <strong>{{ item.title }}</strong
            ><small>{{ item.guestName }}</small>
          </div>
        </div></TransitionGroup
      >
    </div>
  </main>
</template>
