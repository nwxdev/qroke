<script setup lang="ts">
const { storageKey, id: activePartyId } = usePartyRoute()
const { failure, connected, state, refresh, session, adminDialogOpen } = useParty()
const warning = useState(storageKey('player-warning'), () => '')
const warningKind = useState<'network' | 'activate' | 'load' | 'other'>(
  storageKey('player-warning-kind'),
  () => 'other',
)
const menuOpen = useState('qroke:menu-open', () => false)
const retrying = ref(false)
const offline = computed(() => !connected.value && !!state.value)
const retryLabel = computed(() =>
  warningKind.value === 'activate' ? 'Ativar som' : 'Tentar novamente',
)
async function reconnect() {
  if (retrying.value) return
  retrying.value = true
  try {
    await refresh()
    if (connected.value) {
      await session().catch(() => {})
      window.dispatchEvent(new Event('qroke:retry-media'))
    }
  } finally {
    retrying.value = false
  }
}
function retryMedia() {
  if (warningKind.value === 'network') void reconnect()
  else window.dispatchEvent(new Event('qroke:retry-media'))
}
</script>
<template>
  <Teleport to="body">
    <aside v-show="!menuOpen" class="party-alerts" aria-label="Avisos da festa">
      <div v-if="offline" class="alert-card connection-alert" role="alert">
        <AppIcon name="warning" />
        <div class="alert-content">
          <strong>Sem conexão com a festa</strong>
          <p>
            Reconectando… Seus pedidos e a reprodução serão atualizados assim que o servidor
            responder.
          </p>
          <button :disabled="retrying" @click="reconnect">
            <AppIcon name="refresh" />{{ retrying ? 'Tentando reconectar…' : 'Tentar novamente' }}
          </button>
        </div>
      </div>
      <div
        v-if="warning && !(offline && warningKind === 'network')"
        class="alert-card media-alert"
        role="alert"
      >
        <AppIcon name="warning" />
        <div class="alert-content">
          <strong>{{
            warningKind === 'network'
              ? 'Falha na comunicação do player'
              : 'A reprodução precisa de atenção'
          }}</strong>
          <p>{{ warning }}</p>
          <button v-if="warningKind !== 'other'" :disabled="retrying" @click="retryMedia">
            <AppIcon :name="warningKind === 'activate' ? 'volume' : 'refresh'" />{{
              retrying ? 'Tentando reconectar…' : retryLabel
            }}
          </button>
        </div>
        <button
          v-if="warningKind !== 'network'"
          class="alert-close"
          aria-label="Fechar aviso de reprodução"
          @click="warning = ''"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <div v-if="failure && !adminDialogOpen" class="alert-card error-alert" role="alert">
        <AppIcon name="warning" />
        <div class="alert-content">
          <strong>Não foi possível concluir</strong>
          <p>{{ failure }}</p>
        </div>
        <button class="alert-close" aria-label="Fechar aviso" @click="failure = ''">
          <AppIcon name="close" />
        </button>
      </div>
      <PlaybackNotice />
    </aside>
  </Teleport>
</template>
<style scoped>
.party-alerts {
  position: fixed;
  z-index: 100;
  top: calc(100px + var(--qroke-install-space, 0px) + env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  width: min(480px, calc(100vw - 32px));
  display: grid;
  gap: 12px;
  max-height: calc(100dvh - 190px - var(--qroke-dock-space, 0px) - env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  pointer-events: none;
}
.alert-card,
.party-alerts :deep(.playback-notice) {
  pointer-events: auto;
  margin: 0;
  padding: 18px;
  border: 1px solid var(--coral);
  border-left: 4px solid var(--coral);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 12px 36px #0004;
}
.alert-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.alert-card > .app-icon {
  color: var(--coral);
  margin-top: 3px;
}
.alert-content {
  min-width: 0;
  flex: 1;
}
.alert-content strong {
  display: block;
  font-size: 15px;
}
.alert-content p {
  margin: 6px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.alert-content button {
  margin-top: 12px;
  font-size: 13px;
}
.alert-close {
  padding: 0;
  flex-shrink: 0;
  background: transparent;
}
</style>
