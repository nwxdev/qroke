<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const props = defineProps<{ compact?: boolean; items: QueueItem[]; current?: QueueItem | null }>()
const entries = computed(() => {
  const result: {
    key: string
    playlist?: QueueItem['playlist']
    guestName?: string
    current?: QueueItem
    tracks: QueueItem[]
  }[] = []
  const groups = new Map<string, (typeof result)[number]>()
  for (const item of [...(props.current?.playlist ? [props.current] : []), ...props.items]) {
    if (!item.playlist) {
      result.push({ key: item.queueId, tracks: [item] })
      continue
    }
    const key = item.guestId + ':' + item.playlist.id
    if (!groups.has(key)) {
      const entry = {
        key,
        playlist: item.playlist,
        guestName: item.guestName,
        tracks: [] as QueueItem[],
      }
      result.push(entry)
      groups.set(key, entry)
    }
    const entry = groups.get(key)!
    if (item.queueId === props.current?.queueId) entry.current = item
    else entry.tracks.push(item)
  }
  return result
})
</script>
<template>
  <div class="player-queue-items">
    <template v-for="entry in entries" :key="entry.key">
      <details v-if="entry.playlist" class="player-playlist-card">
        <summary>
          <AppIcon name="playlist" /><span
            ><strong>{{ entry.playlist.title }}</strong
            ><small
              >{{ entry.guestName }} · {{ entry.tracks.length }} na fila{{
                entry.current ? ' · tocando' : ''
              }}</small
            ></span
          ><AppIcon name="expand" />
        </summary>
        <p v-if="entry.current" class="playlist-current">
          <span class="tag">Tocando agora</span> {{ entry.current.title }}
        </p>
        <QueueList v-if="entry.tracks.length" :items="entry.tracks" read-only :compact="compact" />
      </details>
      <QueueList v-else :items="entry.tracks" read-only :compact="compact" />
    </template>
  </div>
</template>
<style scoped>
.player-queue-items {
  display: grid;
  gap: 12px;
}
.player-playlist-card {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  background: var(--surface-2);
  min-width: 0;
}
.player-playlist-card summary {
  display: flex;
  gap: 10px;
  align-items: center;
  cursor: pointer;
  min-height: 44px;
  list-style: none;
}
.player-playlist-card summary > span {
  flex: 1;
  min-width: 0;
}
.player-playlist-card strong,
.player-playlist-card small {
  display: block;
  overflow-wrap: anywhere;
}
.player-playlist-card[open] summary > .app-icon:last-child {
  transform: rotate(180deg);
}
.playlist-current {
  overflow-wrap: anywhere;
  font-size: 13px;
}
</style>
