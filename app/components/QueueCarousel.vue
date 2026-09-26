<script setup lang="ts">
const { queue, guest, pending, remove } = useParty()
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
  () => queue.value.map((item) => item.queueId).join('|'),
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
          A seguir <span class="count-badge">{{ queue.length }}</span>
        </h2>
      </div>
      <div class="carousel-controls">
        <button :disabled="atStart" aria-label="Ver músicas anteriores" @click="slide(-1)">
          ←
        </button>
        <button :disabled="atEnd" aria-label="Ver próximas músicas" @click="slide(1)">→</button>
      </div>
    </div>
    <ol
      ref="rail"
      class="queue-rail"
      tabindex="0"
      aria-label="Fila de músicas, role para os lados"
      @scroll.passive="position"
    >
      <TransitionGroup name="queue">
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
          <p class="queue-card-guest">
            Pedido de <strong>{{ item.guestName }}</strong>
          </p>
        </li>
      </TransitionGroup>
      <li v-if="!queue.length" class="queue-card-empty">
        A fila está livre. Busque uma música abaixo para começar.
      </li>
    </ol>
  </section>
</template>
