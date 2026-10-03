<script setup lang="ts">
const { state, control, pending } = useParty()
const seconds = ref(state.value?.karaokeDelaySeconds ?? 10),
  music = ref(state.value?.karaokeTransitionMusic ?? true)
watch([() => state.value?.karaokeDelaySeconds, () => state.value?.karaokeTransitionMusic], () => {
  seconds.value = state.value?.karaokeDelaySeconds ?? 10
  music.value = state.value?.karaokeTransitionMusic ?? true
})
const save = () =>
  control({ action: 'karaoke-settings', seconds: seconds.value, music: music.value })
</script>
<template>
  <form class="karaoke-settings" @submit.prevent="save">
    <label
      >Preparação do karaokê (segundos)<input
        v-model.number="seconds"
        type="number"
        min="0"
        max="30"
        step="1"
        required
        :disabled="pending"
    /></label>
    <label class="transition-music"
      ><input v-model="music" type="checkbox" :disabled="pending" /> Vinheta na transição</label
    >
    <button type="submit" :disabled="pending">Salvar karaokê</button>
    <small
      >De 0 a 30 segundos; padrão 10. O tempo vale para a próxima faixa. A vinheta acompanha o
      volume do PLAYER.</small
    >
  </form>
</template>
<style scoped>
.karaoke-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.karaoke-settings label {
  display: grid;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
}
.karaoke-settings input[type='number'] {
  width: 100%;
}
.karaoke-settings .transition-music {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.transition-music input {
  width: 20px;
  min-height: 20px;
}
.karaoke-settings small {
  grid-column: 1 / -1;
  font-size: 11px;
}
@media (max-width: 600px) {
  .karaoke-settings {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
