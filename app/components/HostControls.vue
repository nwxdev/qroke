<script setup lang="ts">
defineProps<{ tv?: boolean }>()
const { state, device, control, pending, playHere } = useParty()
</script>
<template>
  <div class="host-controls">
    <section class="control-group" aria-label="Reprodução">
      <h3><AppIcon name="play" /> Reprodução</h3>
      <div class="control-row">
        <button :disabled="pending || !state?.canGoBack" @click="control({ action: 'previous' })">
          <AppIcon name="previous" /><span>Música anterior</span>
        </button>
        <button
          class="primary-button"
          :disabled="pending || !state?.current || state?.playbackIssue?.halted"
          @click="control({ action: 'pause', paused: !state?.paused })"
        >
          <AppIcon :name="state?.paused ? 'play' : 'pause'" /><span>{{
            state?.paused ? 'Continuar' : 'Pausar'
          }}</span>
        </button>
        <button :disabled="pending || !state?.current" @click="control({ action: 'skip' })">
          <AppIcon name="next" /><span>Pular</span>
        </button>
      </div>
      <button class="play-here" :disabled="pending || !device" @click="playHere">
        <AppIcon name="tv" /> Tocar neste dispositivo
      </button>
    </section>
    <VolumeControl />
    <div class="control-columns">
      <section class="control-group" aria-label="Modo da tela">
        <h3><AppIcon name="tv" /> Modo da tela</h3>
        <div class="control-row">
          <button
            :disabled="pending"
            :aria-pressed="state?.mode === 'video'"
            @click="control({ action: 'mode', mode: 'video' })"
          >
            <AppIcon name="tv" /> Vídeo
          </button>
          <button
            :disabled="pending"
            :aria-pressed="state?.mode === 'music'"
            @click="control({ action: 'mode', mode: 'music' })"
          >
            <AppIcon name="qr" /> Música
          </button>
        </div>
        <small>Música destaca QR e fila. Faixas de karaokê usam a tela de vídeo.</small>
      </section>
      <section class="control-group" aria-label="Fila e continuação">
        <h3><AppIcon name="playlist" /> Fila e continuação</h3>
        <div class="control-row">
          <button
            :disabled="pending"
            :aria-pressed="state?.autoContinue"
            @click="control({ action: 'auto', enabled: !state?.autoContinue })"
          >
            Rádio {{ state?.autoContinue ? 'ligado' : 'desligado' }}
          </button>
          <button :disabled="pending" @click="control({ action: 'reset-order' })">
            Liberar rodízio e votos
          </button>
        </div>
      </section>
    </div>
    <section class="control-group" aria-label="Configuração do karaokê">
      <h3><AppIcon name="person" /> Karaokê</h3>
      <KaraokeSettings />
    </section>
  </div>
</template>
<style scoped>
.host-controls {
  display: grid;
  gap: 18px;
}
.control-group {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
}
.control-group h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin: 0 0 14px;
}
.control-group .control-row {
  margin: 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.control-group button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}
.control-group small {
  display: block;
  margin-top: 12px;
  font-size: 11px;
}
.play-here {
  margin-top: 12px;
}
.control-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
:deep(.karaoke-settings) {
  border: 0;
  padding: 0;
}
@media (max-width: 950px) {
  .control-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 450px) {
  .control-group .control-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .play-here {
    width: 100%;
  }
}
</style>
