<script setup lang="ts">
const { state, isPlayer, adminDialogOpen, soundDevice, device } = useParty()
const { href, page: partyPage } = usePartyRoute()
const { waiting: karaokeWaiting } = useKaraokeCountdown()
const cinema = useState('qroke:karaoke-cinema', () => false)
const menuOpen = useState('qroke:menu-open', () => false)
const joinOpen = useState('qroke:join-open', () => false)
const root = ref<HTMLElement | null>(null)
const media = ref<{
  activate: () => Promise<void>
  prepareRelocation: () => void
  finishRelocation: () => Promise<void>
} | null>(null)
const playerWindow = shallowRef<Window | null>(null)
const miniSupported = ref(false)
const opening = ref(false)
const miniError = ref('')
let disposed = false
let themeObserver: MutationObserver | undefined
const awake = useScreenAwake(
  computed(
    () =>
      isPlayer.value &&
      soundDevice.value === device.value?.id &&
      !!state.value?.current &&
      !state.value?.paused &&
      !state.value?.playbackIssue?.halted,
  ),
  playerWindow,
)
const screenStatus = computed(
  () =>
    ({
      active: 'Tela ligada',
      off: 'Tela livre',
      released: 'Tela pode apagar',
      unavailable: 'Tela automática',
    })[awake.status.value],
)
type PipWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options: { width: number; height: number }) => Promise<Window>
  }
}
async function relocate(target: Window | null) {
  media.value?.prepareRelocation()
  playerWindow.value = target
  await nextTick()
  if (!disposed) await media.value?.finishRelocation()
  place()
}
function restorePlayer() {
  themeObserver?.disconnect()
  if (!disposed) void relocate(null)
}
async function toggleMini() {
  if (playerWindow.value) {
    playerWindow.value.close()
    return
  }
  const api = (window as PipWindow).documentPictureInPicture
  if (!api || opening.value || !isPlayer.value) return
  opening.value = true
  miniError.value = ''
  let popup: Window | undefined
  try {
    const opened: Window = await api.requestWindow({ width: 480, height: 360 })
    popup = opened
    if (disposed || !isPlayer.value) {
      opened.close()
      return
    }
    const doc = opened.document
    doc.title = 'QRokê · Mini player'
    doc.documentElement.lang = 'pt-BR'
    const base = doc.createElement('base')
    base.href = location.origin + '/'
    doc.head.append(base)
    for (const sheet of document.styleSheets) {
      try {
        const style = doc.createElement('style')
        style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
        doc.head.append(style)
      } catch {
        if (!sheet.href) continue
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        doc.head.append(link)
      }
    }
    const copyTheme = () => {
      doc.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark'
      doc.documentElement.dataset.motion = document.documentElement.dataset.motion || 'on'
      doc.documentElement.dataset.partyTheme =
        document.documentElement.dataset.partyTheme || 'classic'
    }
    copyTheme()
    themeObserver = new MutationObserver(copyTheme)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-motion', 'data-party-theme'],
    })
    opened.addEventListener('pagehide', restorePlayer, { once: true })
    await relocate(opened)
  } catch {
    popup?.close()
    miniError.value =
      'Não foi possível abrir o mini player. Mantenha esta aba visível e tente novamente.'
  } finally {
    opening.value = false
  }
}
watch(isPlayer, (selected) => {
  if (!selected) playerWindow.value?.close()
})
const docked = ref(true)
const bounds = ref<Record<string, string>>({})
const route = useRoute()
let resize: ResizeObserver | undefined
let observedStage: HTMLElement | null = null
let frame = 0
let timer: ReturnType<typeof setInterval>
function updatePlacement() {
  if (playerWindow.value) {
    bounds.value = {}
    document.documentElement.style.setProperty('--qroke-dock-space', '0px')
    return
  }
  const stage = document.querySelector<HTMLElement>('[data-player-stage]')
  if (stage !== observedStage) {
    if (observedStage) resize?.unobserve(observedStage)
    observedStage = stage
    if (observedStage) resize?.observe(observedStage)
  }
  const box = stage?.getBoundingClientRect()
  const header = document.querySelector<HTMLElement>('.player-header')?.getBoundingClientRect()
  docked.value =
    !!menuOpen.value ||
    !!joinOpen.value ||
    !!adminDialogOpen.value ||
    !box ||
    // The fixed header lives in the page stacking context; dock before the video overlaps it.
    (!cinema.value && !!header && box.top < header.bottom) ||
    box.bottom < 220 ||
    box.top > innerHeight - 180
  bounds.value =
    !docked.value && box
      ? {
          left: box.left + 'px',
          top: box.top + 'px',
          width: box.width + 'px',
          height: Math.max(256, box.height) + 'px',
        }
      : {}
  const space = isPlayer.value && docked.value ? (root.value?.offsetHeight || 270) + 20 : 0
  document.documentElement.style.setProperty('--qroke-dock-space', space + 'px')
}
function place() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(updatePlacement)
}
async function returnToPlayer() {
  if (!document.querySelector('[data-player-stage]')) await navigateTo(href('/player'))
  await nextTick()
  document.querySelector('[data-player-stage]')?.scrollIntoView({ block: 'center' })
  place()
}
watch(
  [() => route.path, isPlayer, menuOpen, joinOpen, adminDialogOpen, cinema],
  async () => {
    await nextTick()
    place()
  },
  { flush: 'post' },
)
onMounted(() => {
  miniSupported.value = !!(window as PipWindow).documentPictureInPicture
  window.addEventListener('qroke:mini-player', toggleMini)
  // Follow animated stage dimensions before paint without remounting the media.
  resize = new ResizeObserver(updatePlacement)
  resize.observe(document.body)
  window.addEventListener('scroll', place, { passive: true, capture: true })
  window.addEventListener('resize', place)
  timer = setInterval(place, 500)
  place()
})
onBeforeUnmount(() => {
  disposed = true
  themeObserver?.disconnect()
  playerWindow.value?.close()
  window.removeEventListener('qroke:mini-player', toggleMini)
  cancelAnimationFrame(frame)
  clearInterval(timer)
  resize?.disconnect()
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
  document.documentElement.style.removeProperty('--qroke-dock-space')
})
</script>
<template>
  <Teleport :to="playerWindow?.document.body || 'body'" :disabled="!playerWindow">
    <section
      v-show="isPlayer"
      ref="root"
      class="persistent-player"
      :class="{
        'is-docked': docked && !playerWindow,
        'in-mini-window': !!playerWindow,
        'in-cinema': cinema && partyPage === '/player' && !playerWindow && !docked,
        'preparing-karaoke': karaokeWaiting && partyPage === '/player' && !playerWindow,
      }"
      :style="bounds"
      aria-label="Player da festa"
    >
      <MediaPlayer ref="media" :player-window="playerWindow" />
      <KaraokeCountdown v-if="playerWindow" compact />
      <div class="persistent-controls">
        <div>
          <strong>{{ state?.current?.title || 'Player pronto' }}</strong
          ><small :title="state?.current?.artist">{{ screenStatus }}</small>
        </div>
        <button
          v-if="soundDevice !== device?.id"
          aria-label="Ativar som"
          @click="media?.activate()"
        >
          Ativar som
        </button>
        <button v-if="miniSupported" :disabled="opening" @click="toggleMini">
          {{ playerWindow ? 'Voltar à aba' : 'Mini player' }}
        </button>
        <button
          v-if="docked && !playerWindow"
          aria-label="Voltar ao player na página"
          @click="returnToPlayer"
        >
          Abrir player ↗
        </button>
      </div>
    </section>
    <DismissibleNotice
      v-if="miniError && isPlayer"
      class="mini-error"
      close-label="Fechar aviso do mini player"
      :message="miniError"
      @close="miniError = ''"
    />
  </Teleport>
</template>
<style scoped>
.persistent-player.preparing-karaoke {
  z-index: 20;
  pointer-events: none;
}
.in-mini-window {
  inset: 0 !important;
  width: 100%;
  height: 100%;
  border-radius: 0 !important;
}
.mini-error {
  position: fixed;
  z-index: 140;
  bottom: max(12px, env(safe-area-inset-bottom));
  right: 12px;
  width: min(400px, calc(100vw - 24px));
  background: var(--surface);
  padding: 16px;
  font-size: 12px;
}
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
  min-height: 256px;
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
.in-mini-window .persistent-controls {
  position: relative;
  z-index: 3;
  background: var(--surface);
}
.persistent-controls {
  flex-shrink: 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
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
  padding: 4px 8px;
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

.in-cinema {
  border: 0;
  border-radius: 0;
  background: #000;
}
.in-cinema .persistent-controls {
  display: none;
}
</style>
