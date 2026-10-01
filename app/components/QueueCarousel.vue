<script setup lang="ts">
import type { QueueItem } from '#shared/types'
const { state, queue, guest, pending, remove } = useParty()
const currentStatus = computed(() =>
  state.value?.playbackIssue?.halted
    ? 'Reprodução interrompida'
    : !state.value?.playerId
      ? 'Aguardando reprodução'
      : state.value?.paused
        ? 'Em pausa'
        : 'Tocando agora',
)
type RailEntry = {
  key: string
  playlist?: string
  current?: QueueItem
  tracks: { item: QueueItem; index: number }[]
}
const entries = computed(() => {
  const result: RailEntry[] = []
  const groups = new Map<string, RailEntry>()
  const tracks = [
    ...(state.value?.current?.playlist ? [{ item: state.value.current, index: -1 }] : []),
    ...queue.value.map((item, index) => ({ item, index })),
  ]
  for (const track of tracks) {
    const item = track.item
    if (!item.playlist) {
      result.push({ key: item.queueId, tracks: [track] })
      continue
    }
    const key = item.source + ':' + item.guestId + ':' + item.playlist.id + ':' + item.karaoke
    let group = groups.get(key)
    if (!group) {
      group = { key, playlist: item.playlist.title, tracks: [] }
      groups.set(key, group)
      result.push(group)
    }
    if (track.index < 0) group.current = item
    else group.tracks.push(track)
  }
  return result
})
const rail = ref<HTMLOListElement | null>(null)
const atStart = ref(true),
  atEnd = ref(true)
let observer: ResizeObserver | undefined
function position() {
  const el = rail.value
  if (!el) return
  atStart.value = el.scrollLeft <= 2
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
}
function slide(direction: number) {
  const el = rail.value
  if (!el) return
  const reduced =
    document.documentElement.dataset.motion === 'off' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollBy({ left: direction * el.clientWidth, behavior: reduced ? 'instant' : 'smooth' })
}
watch(
  () => [state.value?.current?.queueId, ...queue.value.map((item) => item.queueId)].join('|'),
  async () => {
    await nextTick()
    position()
  },
)
onMounted(() => {
  observer = new ResizeObserver(position)
  if (rail.value) observer.observe(rail.value)
  position()
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<template>
  <section class="queue-carousel" aria-labelledby="request-queue-title">
    <div class="section-heading">
      <div>
        <span class="eyebrow">AS ESCOLHAS DA GALERA</span>
        <h2 id="request-queue-title">
          Na fila <span class="count-badge">{{ queue.length }} a seguir</span>
        </h2>
      </div>
      <div class="carousel-controls">
        <button :disabled="atStart" aria-label="Ver músicas anteriores" @click="slide(-1)">
          ←
        </button>
        <button :disabled="atEnd" aria-label="Ver próximas músicas" @click="slide(1)">→</button>
      </div>
    </div>
    <p v-if="queue.some((item) => item.manualOrder !== null)" class="hint">
      Ordem definida pelo anfitrião. Novos votos ficam disponíveis quando ele liberar o rodízio.
    </p>
    <ol
      ref="rail"
      class="queue-rail"
      tabindex="0"
      aria-label="Fila de músicas, role para os lados"
      @scroll.passive="position"
    >
      <MotionList>
        <li
          v-if="state?.current && !state.current.playlist"
          :key="'current-' + state.current.queueId"
          class="queue-current-card"
          aria-current="true"
          aria-live="polite"
          aria-atomic="true"
        >
          <div class="queue-card-top">
            <span class="queue-current-status">{{ currentStatus }}</span>
            <span v-if="state.current.karaoke" class="tag">Karaokê</span>
          </div>
          <div class="queue-card-track">
            <img
              v-if="state.current.thumbnail"
              :src="state.current.thumbnail"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
            /><span v-else class="track-art">♫</span>
            <div class="track-info">
              <strong>{{ state.current.title }}</strong>
              <small>{{ state.current.artist }}</small>
            </div>
          </div>
          <p v-if="!state.current.playlist" class="queue-current-guest">
            Pedido de <strong>{{ state.current.guestName }}</strong>
          </p>
          <PlaylistBadge :playlist="state.current.playlist" />
          <KaraokeSingers
            v-if="state.current.karaoke"
            :people="state.current.singers"
            :fallback="state.current.guestName"
          />
        </li>
        <li
          v-for="entry in entries"
          :key="entry.key"
          class="queue-card"
          :class="{
            'queue-current-card': !!entry.current,
            'queue-playlist-card': !!entry.playlist,
          }"
        >
          <details v-if="entry.playlist" class="rail-playlist">
            <summary>
              <span class="eyebrow"><AppIcon name="playlist" /> Playlist</span>
              <strong>{{ entry.playlist }}</strong>
              <small
                >{{ entry.current?.guestName || entry.tracks[0]?.item.guestName }} ·
                {{ entry.tracks.length }} a seguir</small
              >
              <div v-if="entry.current" class="rail-current" aria-current="true">
                <span class="queue-current-status">{{ currentStatus }}</span>
                <strong>{{ entry.current.title }}</strong>
                <small>{{ entry.current.artist }}</small
                ><KaraokeSingers
                  v-if="entry.current.karaoke"
                  :people="entry.current.singers"
                  :fallback="entry.current.guestName"
                />
              </div>
              <span class="rail-expand">Ver músicas <AppIcon name="expand" /></span>
            </summary>
            <ol aria-label="Músicas da playlist na fila">
              <li v-for="{ item, index } in entry.tracks" :key="item.queueId">
                <strong>#{{ index + 1 }} · {{ item.title }}</strong
                ><small>{{ item.artist }}</small>
                <KaraokeSingers
                  v-if="item.karaoke"
                  :people="item.singers"
                  :fallback="item.guestName"
                />
                <QueueVote :item="item" :index="index" />
                <button
                  v-if="guest?.id === item.guestId"
                  class="remove-button"
                  :disabled="pending"
                  :aria-label="'Remover ' + item.title"
                  @click="remove(item.queueId)"
                >
                  ×
                </button>
              </li>
            </ol>
          </details>
          <template v-else v-for="{ item, index } in entry.tracks" :key="item.queueId">
            <div class="queue-card-top">
              <span class="queue-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span v-if="item.karaoke" class="tag">Karaokê</span>
              <button
                v-if="guest?.id === item.guestId"
                class="remove-button"
                :disabled="pending || item.queueId === 'pending'"
                :aria-label="'Remover ' + item.title"
                @click="remove(item.queueId)"
              >
                ×
              </button>
            </div>
            <div class="queue-card-track">
              <img
                v-if="item.thumbnail"
                :src="item.thumbnail"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
              /><span v-else class="track-art">♫</span>
              <div class="track-info">
                <strong>{{ item.title }}</strong
                ><small>{{ item.artist }}</small>
              </div>
            </div>
            <p class="queue-card-guest">{{ item.guestName }}</p>
            <KaraokeSingers v-if="item.karaoke" :people="item.singers" :fallback="item.guestName" />
            <div class="queue-card-vote"><QueueVote :item="item" :index="index" /></div>
          </template>
        </li>
      </MotionList>
      <li v-if="!queue.length" class="queue-card-empty">
        <div>Escolha a próxima música.<br /><QueueSearchLink /></div>
      </li>
    </ol>
  </section>
</template>
<style scoped>
.rail-playlist summary {
  cursor: pointer;
  list-style: none;
  display: grid;
  gap: 8px;
  min-height: 150px;
}
.rail-playlist summary::-webkit-details-marker {
  display: none;
}
.rail-playlist strong {
  overflow-wrap: anywhere;
}
.rail-current {
  border-top: 1px solid var(--line);
  padding-top: 10px;
  display: grid;
  gap: 4px;
}
.rail-current strong {
  font-size: 14px;
}
.rail-expand {
  color: var(--accent);
  display: flex;
  gap: 8px;
  font-size: 12px;
}
.rail-playlist ol {
  max-height: 300px;
  overflow-y: auto;
  padding: 0;
  list-style: none;
}
.rail-playlist li {
  padding: 12px 0;
  border-top: 1px solid var(--line);
  font-size: 12px;
}
.rail-playlist li > strong,
.rail-playlist li > small {
  display: block;
}
</style>
