<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { QueueItem } from '../../shared/types'
const { href } = usePartyRoute()
const { state, admin, pending, reorder, isPlayer, sessionReady, managed } = useParty()
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
const tab = ref('queue')
const tabs = [
  { id: 'queue', label: 'Fila', icon: 'playlist' as const },
  { id: 'devices', label: 'Dispositivos', icon: 'tv' as const },
  { id: 'settings', label: 'Player', icon: 'play' as const },
  { id: 'party', label: 'Festa', icon: 'person' as const },
]
const unlock = ref(false)
watch(
  sessionReady,
  (ready) => {
    if (ready) unlock.value = !admin.value && !managed.value
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
  <div class="page-shell host-page">
    <BrandHeader
      ><button v-if="!admin && !managed" class="header-control" @click="unlock = true">
        <AppIcon name="lock" />Liberar controles</button
      ><AdminExit
    /></BrandHeader>
    <PartyNotice />
    <GuestIdentity />
    <main>
      <div class="page-title">
        <h1>Sua festa</h1>
      </div>
      <p v-if="!admin" class="panel">
        Peça ao dono da festa para tornar você DJ no painel de dispositivos.
      </p>
      <section v-if="admin && !managed" class="panel">
        <AdminStatus /><HostInvitation /><EndParty /><HostControls /><DeviceManager /><PlayerStage
          v-if="isPlayer"
        />
      </section>
      <div v-if="admin" class="host-workspace" :class="{ legacy: !managed }">
        <nav v-if="managed" class="host-tabs" aria-label="Gerenciar festa">
          <button
            v-for="item in tabs"
            :key="item.id"
            :aria-current="tab === item.id ? 'page' : undefined"
            @click="tab = item.id"
          >
            <AppIcon :name="item.icon" /><span>{{ item.label }}</span>
          </button>
        </nav>
        <section v-if="tab === 'devices'"><DeviceManager /></section>
        <section v-else-if="tab === 'settings'" class="panel">
          <div class="section-heading">
            <h2>Configurações do player</h2>
            <AdminStatus />
          </div>
          <HostControls />
          <PlayerStage v-if="isPlayer" />
          <DismissibleNotice v-if="state?.catalogWarning" :message="state.catalogWarning" />
        </section>
        <section v-else-if="tab === 'party'" class="panel">
          <h2>Convite e participantes</h2>
          <PartyAppearance /><SessionLink /><HostInvitation /><PartyPeople /><EndParty />
        </section>
        <section v-else class="panel">
          <div class="section-heading">
            <h2>Fila da festa</h2>
            <span>{{ state?.queue.length || 0 }} faixas</span>
          </div>
          <QueueCarousel />
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
          <YoutubePlaylists />
        </section>
      </div>
    </main>
    <footer><LegalLinks new-tab /></footer>
    <AdminDialog v-model="unlock" />
  </div>
</template>

<style scoped>
.host-workspace.legacy {
  grid-template-columns: minmax(0, 1fr);
}
.host-workspace {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.host-tabs {
  display: grid;
  gap: 8px;
  position: sticky;
  top: 16px;
}
.host-tabs button {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 48px;
  text-align: left;
}
.host-tabs button[aria-current] {
  background: var(--accent);
  color: var(--on-accent);
}
@media (min-width: 761px) and (max-width: 1100px) {
  .host-workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .host-tabs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    position: static;
  }
  .host-tabs button {
    justify-content: center;
    padding: 10px 8px;
    font-size: 13px;
  }
}
@media (max-width: 760px) {
  .host-page {
    padding-bottom: calc(90px + env(safe-area-inset-bottom));
  }
  .host-workspace.legacy {
    grid-template-columns: minmax(0, 1fr);
  }
  .host-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .host-tabs {
    position: fixed;
    inset: auto 0 0;
    z-index: 55;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
    background: var(--bg);
    border-top: 1px solid var(--line);
  }
  .host-tabs button {
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    font-size: 11px;
    padding: 8px 2px;
  }
}
</style>
