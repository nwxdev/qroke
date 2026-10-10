<script setup lang="ts">
import type { PlaylistPreview } from '../../shared/playlists'
const props = defineProps<{ preview: PlaylistPreview; busy: boolean; imported: boolean }>()
defineEmits<{ add: [videoId?: string]; more: [] }>()
const { state, queue } = useParty()
const { feedback } = usePartyMotion()
const search = ref('')
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
const tracks = computed(() => {
  const query = normalize(search.value.trim())
  return props.preview.tracks.filter(
    (track) => !query || normalize(track.title + ' ' + track.artist).includes(query),
  )
})
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
  <MotionReveal class="playlist-preview" glow>
    <h3>{{ preview.playlist.title }}</h3>
    <p>{{ preview.playlist.channel }} · {{ preview.playlist.count }} itens na playlist</p>
    <p class="hint">
      {{ preview.tracks.length }} músicas disponíveis<span v-if="preview.skipped">
        · {{ preview.skipped }} indisponíveis ou repetidas</span
      >.
    </p>
    <label class="playlist-filter"
      >Buscar nesta playlist
      <input v-model="search" type="search" placeholder="Música ou artista" />
    </label>
    <p v-if="search" class="hint">{{ tracks.length }} resultados neste lote carregado.</p>
    <ol v-if="tracks.length" class="playlist-tracks" aria-label="Faixas da playlist">
      <li v-for="track in tracks" :key="track.id">
        <img
          v-if="track.thumbnail"
          :src="track.thumbnail"
          alt=""
          loading="lazy"
          width="56"
          height="56"
        />
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
          <MotionCue
            :trigger="feedback?.target === 'track:youtube:' + track.id ? feedback.id : 0"
            kind="add"
          >
            <AppIcon :name="position(track.id) ? 'check' : 'plus'" />
          </MotionCue>
        </button>
      </li>
    </ol>
    <p v-else class="notice">
      {{
        search
          ? 'Nenhuma música corresponde à busca neste lote.'
          : 'Nenhuma faixa reproduzível neste lote.'
      }}
    </p>
    <div class="playlist-actions">
      <button
        class="playlist-add"
        :disabled="busy || imported || allQueued || !preview.tracks.length"
        @click="$emit('add')"
      >
        <MotionCue
          :trigger="feedback?.target === 'playlist:' + preview.playlist.id ? feedback.id : 0"
          kind="playlist"
        >
          <AppIcon :name="imported || allQueued ? 'check' : 'playlist-plus'" /> </MotionCue
        >{{
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
  </MotionReveal>
</template>
<style scoped>
.playlist-filter {
  display: grid;
  gap: 8px;
}
.playlist-filter input {
  width: 100%;
  min-width: 0;
}
.playlist-tracks img {
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
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
@media (max-width: 600px) {
  .playlist-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .playlist-actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>
