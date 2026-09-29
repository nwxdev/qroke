<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { QueueItem } from '../../shared/types'
const { state, admin, pending, reorder, isPlayer } = useParty()
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
onMounted(() => {
  unlock.value = !admin.value
})
watch(admin, (value, previous) => {
  if (value) unlock.value = false
  else if (previous) {
    unlock.value = false
    void navigateTo('/busca', { replace: true })
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
    <main>
      <div class="page-title">
        <span class="eyebrow">BASTIDORES</span>
        <h1>O ritmo está nas suas mãos.</h1>
        <p>Escolha onde tocar. Cuide da fila. Aproveite a festa.</p>
      </div>
      <div class="host-layout">
        <section>
          <div v-if="!admin" class="panel">
            <h2>O controle é seu por alguns minutos.</h2>
            <p>Abra o menu e escolha Liberar controles para entrar com o PIN.</p>
          </div>
          <div v-if="admin" class="panel">
            <div class="section-heading">
              <h2>Controles</h2>
              <AdminStatus />
            </div>
            <p v-if="!state?.playerId" class="notice">
              Para começar, clique em <strong>Tocar neste dispositivo</strong> no computador ou TV
              que vai emitir o som. Depois disso, os pedidos começam automaticamente quando a fila
              está vazia.
            </p>
            <HostControls />
            <p v-if="state?.catalogWarning" class="notice">{{ state.catalogWarning }}</p>
          </div>
          <DeviceManager v-if="admin" />
          <PartyPeople />
          <YoutubePlaylists v-if="admin" />
          <MediaPlayer v-if="isPlayer" />
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
              :animation="180"
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
    <AdminDialog v-model="unlock" />
  </div>
</template>
