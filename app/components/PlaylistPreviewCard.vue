<script setup lang="ts">
import type { PlaylistPreview } from '../../shared/playlists'
const props = defineProps<{ preview: PlaylistPreview; busy: boolean; imported: boolean }>()
defineEmits<{ add: [videoId?: string]; more: [] }>()
const { state, queue } = useParty()
function position(id: string) {
  if (state.value?.current?.source === 'youtube' && state.value.current.id === id)
    return 'Tocando agora'
  const index = queue.value.findIndex((track) => track.source === 'youtube' && track.id === id)
  return index < 0 ? '' : 'Na fila · #' + (index + 1)
}
const allQueued = computed(
  () =>
    props.preview.tracks.length > 0 && props.preview.tracks.every((track) => !!position(track.id)),
)
</script>
<template>
  <div class="playlist-preview">
    <h3>{{ preview.playlist.title }}</h3>
    <p>{{ preview.playlist.channel }} · {{ preview.playlist.count }} itens na playlist</p>
    <p class="hint">
      {{ preview.tracks.length }} faixas disponíveis neste lote de {{ preview.inspected }} itens.
      {{ preview.skipped }} indisponíveis ou repetidas foram ignoradas.
    </p>
    <ol v-if="preview.tracks.length" class="playlist-tracks" aria-label="Faixas da playlist">
      <li v-for="track in preview.tracks" :key="track.id">
        <div>
          <strong>{{ track.title }}</strong
          ><small>{{ track.artist }}</small
          ><span v-if="position(track.id)" class="tag">{{ position(track.id) }}</span>
        </div>
        <button
          :disabled="busy || !!position(track.id) || imported"
          :aria-label="'Adicionar somente ' + track.title"
          @click="$emit('add', track.id)"
        >
          <AppIcon :name="position(track.id) ? 'check' : 'plus'" />
        </button>
      </li>
    </ol>
    <p v-else class="notice">
      Nenhuma faixa reproduzível neste lote. Versões bloqueadas ou indisponíveis são ignoradas.
    </p>
    <div class="playlist-actions">
      <button
        class="playlist-add"
        :disabled="busy || imported || allQueued || !preview.tracks.length"
        @click="$emit('add')"
      >
        <AppIcon :name="imported || allQueued ? 'check' : 'playlist-plus'" />{{
          imported || allQueued
            ? 'Adicionadas à fila'
            : 'Adicionar ' + preview.tracks.length + ' músicas'
        }}
      </button>
      <button v-if="preview.nextPageToken" :disabled="busy" @click="$emit('more')">
        Próximo lote <AppIcon name="next" />
      </button>
    </div>
    <p v-if="preview.nextPageToken" class="hint">
      Esta playlist continua. Confira o próximo lote (até 200 itens por lote).
    </p>
  </div>
</template>
<style scoped>
.playlist-preview {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  min-width: 0;
}
.playlist-preview h3,
.playlist-preview p,
.playlist-preview strong {
  overflow-wrap: anywhere;
}
.playlist-tracks {
  max-height: 340px;
  overflow: auto;
  padding: 0;
  list-style: none;
}
.playlist-tracks li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.playlist-tracks li > div {
  flex: 1;
  min-width: 0;
}
.playlist-tracks small {
  display: block;
}
.playlist-tracks button {
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
}
.playlist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.playlist-actions button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.playlist-add {
  background: var(--accent);
  color: var(--on-accent);
}
</style>
