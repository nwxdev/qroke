<script setup lang="ts">
const { state, isPlayer, adminDialogOpen, soundDevice, device } = useParty()
const { href } = usePartyRoute()
const menuOpen = useState('qroke:menu-open', () => false)
const joinOpen = useState('qroke:join-open', () => false)
const root = ref<HTMLElement | null>(null)
const media = ref<{ activate: () => Promise<void> } | null>(null)
const docked = ref(true)
const bounds = ref<Record<string, string>>({})
const route = useRoute()
let resize: ResizeObserver | undefined
let frame = 0
let timer: ReturnType<typeof setInterval>
function place() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const stage = document.querySelector<HTMLElement>('[data-player-stage]')
    const box = stage?.getBoundingClientRect()
    docked.value =
      !!menuOpen.value ||
      !!joinOpen.value ||
      !!adminDialogOpen.value ||
      !box ||
      box.bottom < 220 ||
      box.top > innerHeight - 180
    bounds.value =
      !docked.value && box
        ? {
            left: box.left + 'px',
            top: box.top + 'px',
            width: box.width + 'px',
            height: Math.max(264, box.height) + 'px',
          }
        : {}
    const space = isPlayer.value && docked.value ? (root.value?.offsetHeight || 270) + 20 : 0
    document.documentElement.style.setProperty('--qroke-dock-space', space + 'px')
  })
}
async function returnToPlayer() {
  if (!document.querySelector('[data-player-stage]')) await navigateTo(href('/player'))
  await nextTick()
  document.querySelector('[data-player-stage]')?.scrollIntoView({ block: 'center' })
  place()
}
watch(
  [() => route.path, isPlayer, menuOpen, joinOpen, adminDialogOpen],
  async () => {
    await nextTick()
    place()
  },
  { flush: 'post' },
)
onMounted(() => {
  resize = new ResizeObserver(place)
  resize.observe(document.body)
  window.addEventListener('scroll', place, { passive: true, capture: true })
  window.addEventListener('resize', place)
  timer = setInterval(place, 500)
  place()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  clearInterval(timer)
  resize?.disconnect()
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
  document.documentElement.style.removeProperty('--qroke-dock-space')
})
</script>
<template>
  <section
    v-show="isPlayer"
    ref="root"
    class="persistent-player"
    :class="{ 'is-docked': docked }"
    :style="bounds"
    aria-label="Player da festa"
  >
    <MediaPlayer ref="media" />
    <div class="persistent-controls">
      <div>
        <strong>{{ state?.current?.title || 'Player pronto' }}</strong
        ><small>{{ state?.current?.artist }}</small>
      </div>
      <button v-if="soundDevice !== device?.id" aria-label="Ativar som" @click="media?.activate()">
        Ativar som
      </button>
      <button v-if="docked" aria-label="Voltar ao player na página" @click="returnToPlayer">
        Abrir player ↗
      </button>
    </div>
  </section>
</template>
<style scoped>
.persistent-player {
  position: fixed;
  z-index: 25;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  min-width: 200px;
  min-height: 264px;
}
.persistent-player :deep(.media-player),
.persistent-player :deep(.media-viewport) {
  flex: 1;
  min-height: 200px;
  height: 100%;
  width: 100%;
  aspect-ratio: auto;
  margin: 0;
}
.persistent-player :deep(.media-player) {
  min-height: 0;
}
.persistent-player :deep(.media-viewport) {
  border-radius: 0;
}
.persistent-player :deep(.local-player) {
  padding: 12px;
}
.persistent-player :deep(.local-player .vinyl) {
  display: none;
}
.persistent-controls {
  flex-shrink: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
}
.persistent-controls > div {
  min-width: 0;
  flex: 1;
}
.persistent-controls strong,
.persistent-controls small {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
}
.persistent-controls button {
  flex-shrink: 0;
  font-size: 12px;
  padding: 6px 10px;
}
.is-docked {
  z-index: 120;
  left: auto;
  top: auto;
  right: 16px;
  bottom: max(8px, env(safe-area-inset-bottom));
  width: min(360px, calc(100vw - 24px));
  height: 264px;
  box-shadow: 0 10px 36px #0006;
}
@media (max-width: 600px) {
  .is-docked {
    right: 12px;
  }
}
.persistent-player :deep(.local-player h2) {
  font-size: 16px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-height: 480px) and (min-width: 520px) {
  .is-docked {
    width: 220px;
    right: 8px;
  }
}
</style>
