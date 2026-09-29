<script setup lang="ts">
const { state, pending, control } = useParty()
const id = useId()
const volume = ref(state.value?.volume ?? 100),
  editing = ref(false),
  previous = ref(100)
watch(
  () => state.value?.volume ?? 100,
  (value) => {
    if (!editing.value) volume.value = value
    if (value > 0) previous.value = value
  },
)
async function apply() {
  editing.value = false
  await control({ action: 'volume', volume: volume.value })
  volume.value = state.value?.volume ?? 100
}
async function mute() {
  volume.value = volume.value ? 0 : previous.value
  await apply()
}
</script>
<template>
  <div class="volume-control">
    <label :for="id"
      ><AppIcon :name="volume ? 'volume' : 'muted'" /> Volume do PLAYER
      <strong>{{ volume }}%</strong></label
    >
    <div class="volume-row">
      <button
        :disabled="pending"
        :aria-label="volume ? 'Silenciar player' : 'Restaurar volume'"
        @click="mute"
      >
        <AppIcon :name="volume ? 'volume' : 'muted'" />
      </button>
      <input
        :id="id"
        v-model.number="volume"
        type="range"
        min="0"
        max="100"
        step="1"
        :disabled="pending"
        :aria-valuetext="volume + ' por cento'"
        @input="editing = true"
        @change="apply"
      />
    </div>
    <p
      v-if="
        state?.playerVolume &&
        state.playerVolume.deviceId === state.playerId &&
        state.playerVolume.volume === (state.volume ?? 100) &&
        (state.serverTime || 0) - state.playerVolume.at < 8000
      "
      class="volume-feedback"
      role="status"
    >
      PLAYER confirmou
      {{ state.playerVolume.muted ? 'silêncio' : state.playerVolume.volume + '%' }}.
    </p>
    <p v-else class="volume-feedback" role="status">
      {{
        state?.playerId
          ? 'Aguardando confirmação do PLAYER. Se não atualizar, recarregue a página no aparelho que toca.'
          : 'Escolha um PLAYER para aplicar o volume.'
      }}
    </p>
    <small
      >Controla o áudio do aplicativo no aparelho selecionado. O volume da caixa ou do sistema
      continua separado.</small
    >
  </div>
</template>
<style scoped>
.volume-feedback {
  margin: 0;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.volume-control {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.volume-control label,
.volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.volume-control strong {
  margin-left: auto;
}
.volume-row input {
  width: 100%;
  min-width: 0;
  padding: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.volume-control small {
  font-size: 11px;
}
</style>
