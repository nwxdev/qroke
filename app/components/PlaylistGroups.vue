<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const { queue, state } = useParty()
const searches = reactive<Record<string, string>>({})
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
const groups = computed(() => {
  const result = new Map<
    string,
    { title: string; name: string; items: { item: QueueItem; position: string }[] }
  >()
  const tracks = [
    ...(state.value?.current ? [{ item: state.value.current, position: 'Tocando agora' }] : []),
    ...queue.value.map((item, index) => ({ item, position: '#' + (index + 1) })),
  ]
  for (const entry of tracks) {
    const item = entry.item
    if (!item.playlist) continue
    const key = item.guestId + ':' + item.playlist.id
    if (!result.has(key))
      result.set(key, { title: item.playlist.title, name: item.guestName, items: [] })
    result.get(key)!.items.push(entry)
  }
  return [...result].map(([key, group]) => ({
    key,
    ...group,
    visible: group.items.filter(
      ({ item }) =>
        !searches[key]?.trim() ||
        normalize(item.title + ' ' + item.artist).includes(normalize(searches[key]!.trim())),
    ),
  }))
})
</script>
<template>
  <div v-if="groups.length" class="playlist-groups" aria-label="Playlists na festa">
    <details v-for="group in groups" :key="group.key">
      <summary>
        <AppIcon name="playlist" /><span
          ><strong>Playlist · {{ group.title }}</strong
          ><small>{{ group.name }} · {{ group.items.length }} faixa(s) na festa</small></span
        >
      </summary>
      <label class="group-search"
        >Buscar na playlist
        <input
          v-model="searches[group.key]"
          type="search"
          placeholder="Música ou artista"
          :aria-label="'Buscar em ' + group.title"
        />
      </label>
      <p v-if="!group.visible.length" class="hint">Nenhuma música encontrada nesta playlist.</p>
      <ol>
        <li v-for="entry in group.visible" :key="entry.item.queueId">
          <img
            v-if="entry.item.thumbnail"
            :src="entry.item.thumbnail"
            alt=""
            loading="lazy"
            width="40"
            height="40"
          />
          <div>
            <span>{{ entry.position }}</span> {{ entry.item.title
            }}<small>{{ entry.item.artist }}</small>
          </div>
        </li>
      </ol>
    </details>
  </div>
</template>
<style scoped>
.playlist-groups {
  display: grid;
  gap: 8px;
  margin: 14px 0;
  max-height: 320px;
  overflow-y: auto;
}
.playlist-groups details {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  padding: 10px 12px;
  min-width: 0;
}
.playlist-groups summary {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}
.playlist-groups summary::after {
  content: '+';
  margin-left: auto;
}
.playlist-groups details[open] summary::after {
  content: '−';
}
.playlist-groups strong,
.playlist-groups small {
  display: block;
  overflow-wrap: anywhere;
}
.playlist-groups strong {
  font-size: 13px;
}
.playlist-groups ol {
  list-style: none;
  padding: 0;
  margin-bottom: 0;
  max-height: 180px;
  overflow: auto;
}
.group-search {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
}
.group-search input {
  min-width: 0;
  width: 100%;
}
.playlist-groups li img {
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 6px;
}
.playlist-groups li div {
  min-width: 0;
}
.playlist-groups li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  overflow-wrap: anywhere;
  padding: 5px 0;
}
.playlist-groups li span {
  color: var(--accent);
  margin-right: 6px;
}
</style>
