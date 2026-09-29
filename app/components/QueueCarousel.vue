<script setup lang="ts">
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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
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
    <PlaylistGroups />
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
      <TransitionGroup name="queue">
        <li
          v-if="state?.current"
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
        <li v-for="(item, index) in queue" :key="item.queueId" class="queue-card">
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
          <p v-if="!item.playlist" class="queue-card-guest">
            Pedido de <strong>{{ item.guestName }}</strong>
          </p>
          <PlaylistBadge :playlist="item.playlist" />
          <KaraokeSingers v-if="item.karaoke" :people="item.singers" :fallback="item.guestName" />
          <div class="queue-card-vote"><QueueVote :item="item" :index="index" /></div>
        </li>
      </TransitionGroup>
      <li v-if="!queue.length" class="queue-card-empty">
        <div>A fila está livre. Escolha a próxima música.<br /><QueueSearchLink /></div>
      </li>
    </ol>
  </section>
</template>
