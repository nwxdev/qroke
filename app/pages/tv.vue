<script setup lang="ts">
const { state, admin, queue, isPlayer, api, control } = useParty()
const root = ref<HTMLElement | null>(null),
  unlock = ref(false),
  showQr = ref(true),
  controls = ref(false)
const karaoke = computed(() => !!state.value?.current?.karaoke)
const closing = computed(
  () => !!state.value?.duration && state.value.duration - state.value.position <= 5,
)
const expanded = computed(() => karaoke.value && !closing.value && !controls.value && !unlock.value)
let touch = 0
function activity() {
  if (admin.value && Date.now() - touch > 30000) {
    touch = Date.now()
    void api('/api/auth', { action: 'touch' }).catch(() => {})
  }
}
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
      'controls-open': controls || unlock,
      'music-mode': state?.mode === 'music' && !karaoke,
    }"
    @keydown="activity"
    @pointerdown="activity"
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
          {{ admin ? 'Controles' : 'Liberar controles' }}</button
        ><button @click="showQr = !showQr">{{ showQr ? 'Ocultar QR' : 'Mostrar QR' }}</button
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
        </div>
      </section>
      <aside v-if="!expanded" class="tv-aside">
        <div class="section-heading">
          <h2>A seguir</h2>
          <span>{{ queue.length }} faixas</span>
        </div>
        <QueueList :manage="admin && controls" compact /><QrCode v-if="showQr" />
      </aside>
    </div>
    <section v-if="unlock && !admin" class="tv-unlock">
      <AdminUnlock tv /><button @click="back">Voltar</button>
    </section>
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
