<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { QueueItem } from '../../shared/types'
const { href } = usePartyRoute()
const { state, admin, pending, reorder, isPlayer, sessionReady } = useParty()
const { enabled: motionEnabled, reduced: motionReduced } = useMotionPreference()
const dragged = ref<QueueItem[]>([])
const dragging = ref(false)
watch(
  () => state.value?.queue.map((item) => item.queueId).join('|'),
  () => {
    if (!dragging.value) dragged.value = [...(state.value?.queue || [])]
  },
  { immediate: true },
)
async function endDrag() {
  dragging.value = false
  await reorder(dragged.value)
  dragged.value = [...(state.value?.queue || [])]
}
const unlock = ref(false)
watch(
  sessionReady,
  (ready) => {
    if (ready) unlock.value = !admin.value
  },
  { immediate: true },
)
watch(admin, (value, previous) => {
  if (value) unlock.value = false
  else if (previous) {
    unlock.value = false
    void navigateTo(href('/busca'), { replace: true })
  }
})
</script>
<template>
  <div class="page-shell">
    <BrandHeader
      ><button v-if="!admin" class="header-control" @click="unlock = true">
        <AppIcon name="lock" />Liberar controles</button
      ><AdminExit /></BrandHeader
    ><PartyNotice />
    <GuestIdentity />
    <QueueCarousel />
    <main>
      <div class="page-title">
        <h1>Sua festa</h1>
      </div>
      <div class="host-layout">
        <section>
          <div v-if="!admin" class="panel">
            <h2>O controle é seu por alguns minutos.</h2>
            <p>Use Liberar controles no cabeçalho ou no menu para entrar com o PIN.</p>
          </div>
          <div v-if="admin" class="panel">
            <div class="section-heading">
              <h2>Controles</h2>
              <AdminStatus />
            </div>
            <p v-if="!state?.playerId" class="notice">
              Escolha <strong>Tocar neste dispositivo</strong> no aparelho conectado ao som.
            </p>
            <HostInvitation /><EndParty />
            <HostControls />
            <p v-if="state?.catalogWarning" class="notice">{{ state.catalogWarning }}</p>
          </div>
          <DeviceManager v-if="admin" />
          <PartyPeople />
          <YoutubePlaylists v-if="admin" />
          <PlayerStage v-if="isPlayer" />
          <p v-else class="hint">O som será reproduzido apenas no dispositivo escolhido.</p>
        </section>
        <section v-if="admin" class="panel">
          <div class="section-heading">
            <h2>Fila da festa</h2>
            <span>{{ state?.queue.length || 0 }} faixas</span>
          </div>
          <QueueList manage />
          <details v-if="state?.queue.length">
            <summary>Reordenar arrastando</summary>
            <p class="hint">Arraste pela alça. As escolhas humanas ficam antes do rádio.</p>
            <VueDraggable
              v-model="dragged"
              :animation="motionEnabled && !motionReduced ? 180 : 0"
              handle=".drag-handle"
              :disabled="pending"
              @start="dragging = true"
              @end="endDrag"
              ><div v-for="item in dragged" :key="item.queueId" class="drag-row">
                <span class="drag-handle" aria-hidden="true">⠿</span><span>{{ item.title }}</span>
              </div></VueDraggable
            >
          </details>
        </section>
      </div>
    </main>
    <footer><LegalLinks new-tab /></footer>
    <AdminDialog v-model="unlock" />
  </div>
</template>
