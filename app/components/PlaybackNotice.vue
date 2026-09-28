<script setup lang="ts">
const { state, admin, control, pending } = useParty()
</script>
<template>
  <div v-if="state?.playbackIssue" class="notice playback-notice" role="status">
    <strong>{{ state.playbackIssue.title }}</strong>
    <p>
      {{ state.playbackIssue.message
      }}<span v-if="state.playbackIssue.code !== undefined">
        (erro {{ state.playbackIssue.code }})</span
      >
    </p>
    <p v-if="state.playbackIssue.halted">
      A reprodução foi pausada para preservar a fila.
      {{
        admin
          ? 'Tente novamente ou pule somente esta música.'
          : 'Peça ao anfitrião para tentar novamente ou pular esta música.'
      }}
    </p>
    <p v-else>
      Esta faixa foi ignorada. Se a próxima também falhar, a fila será preservada em pausa.
    </p>
    <div class="playback-actions">
      <template v-if="admin && state.playbackIssue.halted">
        <button :disabled="pending" @click="control({ action: 'retry' })">Tentar novamente</button>
        <button :disabled="pending" @click="control({ action: 'skip' })">Pular esta música</button>
      </template>
      <a
        v-if="state.playbackIssue.source === 'youtube'"
        :href="'https://www.youtube.com/watch?v=' + encodeURIComponent(state.playbackIssue.videoId)"
        target="_blank"
        rel="noopener noreferrer"
        >Ver no YouTube ↗</a
      >
    </div>
  </div>
</template>
<style scoped>
.playback-notice {
  display: block;
}
.playback-notice strong,
.playback-notice p {
  overflow-wrap: anywhere;
}
.playback-notice p {
  margin: 8px 0;
}
.playback-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.playback-actions a {
  text-decoration: underline;
}
</style>
