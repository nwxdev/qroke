<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { QueueItem } from '../../shared/types'
const { state, admin, device, pending, control, reorder, isPlayer, api } = useParty()
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
let touched = 0
function activity() {
  if (admin.value && Date.now() - touched > 30000) {
    touched = Date.now()
    void api('/api/auth', { action: 'touch' }).catch(() => {})
  }
}
</script>
<template>
  <div class="page-shell" @pointerdown="activity" @keydown="activity">
    <BrandHeader
      ><NuxtLink to="/tv" class="subtle-link">Abrir TV ↗</NuxtLink
      ><NuxtLink to="/qr" class="subtle-link">QR ↗</NuxtLink></BrandHeader
    ><PartyNotice />
    <main>
      <div class="page-title">
        <span class="eyebrow">BASTIDORES</span>
        <h1>O ritmo está nas suas mãos.</h1>
        <p>Escolha onde tocar. Cuide da fila. Aproveite a festa.</p>
      </div>
      <div class="host-layout">
        <section>
          <AdminUnlock v-if="!admin" />
          <div v-if="admin" class="panel">
            <div class="section-heading">
              <h2>Controles</h2>
              <span class="tag active">Admin liberado</span>
            </div>
            <HostControls />
            <p v-if="state?.catalogWarning" class="notice">{{ state.catalogWarning }}</p>
          </div>
          <div v-if="admin" class="panel device-panel">
            <h2>Onde o som toca</h2>
            <p>Abra uma tela no aparelho e escolha o PLAYER. Ative o som nesse navegador.</p>
            <div v-for="item in state?.devices" :key="item.id" class="device-row">
              <span
                >{{ item.label }} <small v-if="item.id === device?.id">(este aparelho)</small></span
              ><button
                :disabled="pending || state?.playerId === item.id"
                @click="control({ action: 'assign', deviceId: item.id })"
              >
                {{ state?.playerId === item.id ? '● PLAYER' : 'Usar como PLAYER' }}
              </button>
            </div>
            <p
              v-if="state?.playerId && !state?.devices.some((d) => d.id === state?.playerId)"
              class="notice"
            >
              O PLAYER está desconectado. Escolha outro dispositivo.
            </p>
          </div>
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
  </div>
</template>
