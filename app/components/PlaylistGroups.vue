<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const { queue, state } = useParty()
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
  return [...result].map(([key, group]) => ({ key, ...group }))
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
      <ol>
        <li v-for="entry in group.items" :key="entry.item.queueId">
          <span>{{ entry.position }}</span> {{ entry.item.title }}
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
.playlist-groups li {
  font-size: 12px;
  overflow-wrap: anywhere;
  padding: 5px 0;
}
.playlist-groups li span {
  color: var(--accent);
  margin-right: 6px;
}
</style>
