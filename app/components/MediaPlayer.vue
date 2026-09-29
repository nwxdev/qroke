<script setup lang="ts">
/// <reference types="youtube" />
const { state, isPlayer, api, lastContact, device, soundDevice, armSound, adminDialogOpen } =
  useParty()
const route = useRoute()
const { waiting: karaokeWaiting } = useKaraokeCountdown()
const frame = ref<HTMLDivElement | null>(null),
  slot = ref<HTMLElement | null>(null),
  audio = ref<HTMLAudioElement | null>(null)
const armed = computed(() => !!device.value && soundDevice.value === device.value.id),
  warning = ref(''),
  pageVisible = ref(true),
  inView = ref(true),
  slotHeight = ref(200),
  outputs = ref<MediaDeviceInfo[]>([]),
  sink = ref(''),
  clock = ref(Date.now())
let loadedId: string | undefined
let localFinish: { id: string; at: number } | undefined
let yt: YT.Player | undefined,
  observer: IntersectionObserver | undefined,
  timer: ReturnType<typeof setInterval>,
  generation = 0,
  reporting = false
let terminalId: string | undefined
let preparingId: string | undefined
let pendingYoutubeError: { id: string; code: number } | undefined
const current = computed(() => state.value?.current)
const docked = computed(
  () =>
    armed.value && current.value?.source === 'youtube' && !inView.value && !karaokeWaiting.value,
)
// Observar o espaço original evita alternar entre fixo/normal em um ciclo.
watch(
  docked,
  (value) => {
    if (value && slot.value) slotHeight.value = slot.value.getBoundingClientRect().height
  },
  { flush: 'sync' },
)
function returnToPlayer() {
  slot.value?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'center',
  })
}
const safe = computed(
  () =>
    isPlayer.value &&
    clock.value - lastContact.value < 8000 &&
    clock.value >= (state.value?.playerReadyAt || 0),
)
const eligible = computed(
  () =>
    armed.value &&
    (current.value?.source === 'local' || (pageVisible.value && !adminDialogOpen.value)) &&
    safe.value &&
    !state.value?.paused &&
    !state.value?.playbackIssue?.halted &&
    !karaokeWaiting.value,
)
async function report(
  action: 'ended' | 'error' | 'progress',
  id = current.value?.queueId,
  position?: number,
  duration?: number,
  errorCode?: number,
) {
  if (
    !id ||
    !safe.value ||
    id !== current.value?.queueId ||
    state.value?.playbackIssue?.halted ||
    karaokeWaiting.value
  )
    return
  if (action !== 'progress') {
    if (!armed.value || terminalId === id) return
    terminalId = id
  }
  try {
    const volume =
      yt?.getVolume?.() ?? (audio.value ? Math.round(audio.value.volume * 100) : undefined)
    const muted = yt?.isMuted?.() ?? audio.value?.muted
    await api('/api/player', {
      action,
      queueId: id,
      position,
      duration,
      errorCode,
      ...(action === 'progress' ? { volume, muted } : {}),
    })
  } catch {
    if (terminalId === id) terminalId = undefined
    warning.value = 'Sem conexão com o servidor. Reconectando…'
  }
}
function applyVolume() {
  const volume = Math.min(100, Math.max(0, state.value?.volume ?? 100))
  if (loadedId === current.value?.queueId) {
    yt?.setVolume?.(volume)
    if (volume === 0) yt?.mute?.()
    else yt?.unMute?.()
  }
  if (audio.value) {
    audio.value.volume = volume / 100
    audio.value.muted = volume === 0
  }
}
watch(() => state.value?.volume, applyVolume)
const transitionMusic = computed(
  () =>
    karaokeWaiting.value &&
    !!state.value?.karaokeStartsAt &&
    !state.value.paused &&
    !state.value.playbackIssue?.halted &&
    (state.value.karaokeTransitionMusic ?? true) &&
    safe.value &&
    armed.value &&
    pageVisible.value,
)
const { unlock: unlockMusic } = useTransitionMusic(
  transitionMusic,
  computed(() => state.value?.volume ?? 100),
)
async function prepare() {
  const id = current.value?.queueId
  if (
    !karaokeWaiting.value ||
    !id ||
    loadedId !== id ||
    !safe.value ||
    !armed.value ||
    state.value?.paused ||
    state.value?.karaokeStartsAt ||
    preparingId === id
  )
    return
  preparingId = id
  try {
    await api('/api/player', { action: 'ready', queueId: id })
  } catch {
    /* O heartbeat tenta novamente quando o aparelho se reconectar. */
  } finally {
    if (preparingId === id) preparingId = undefined
  }
}
async function sync() {
  void prepare()
  if (!eligible.value) {
    yt?.pauseVideo?.()
    audio.value?.pause()
    return
  }
  if (pendingYoutubeError?.id === current.value?.queueId && pendingYoutubeError) {
    await report('error', pendingYoutubeError.id, undefined, undefined, pendingYoutubeError.code)
    return
  }
  applyVolume()
  yt?.playVideo?.()
  if (audio.value)
    try {
      await audio.value.play()
    } catch {
      warning.value = 'Toque em Ativar som para permitir a reprodução neste navegador.'
    }
}
async function mountTrack() {
  const seq = ++generation,
    track = current.value
  yt?.destroy()
  yt = undefined
  loadedId = undefined
  localFinish = undefined
  terminalId = undefined
  pendingYoutubeError = undefined
  preparingId = undefined
  warning.value = ''
  if (!track || !isPlayer.value) return
  await nextTick()
  if (track.source === 'local') {
    if (audio.value && audio.value.readyState >= 1) localReady(audio.value)
    return
  }
  try {
    await loadYoutube()
    if (seq !== generation || !frame.value) return
    const node = document.createElement('div')
    frame.value.replaceChildren(node)
    const start = state.value?.position || 0
    yt = new YT.Player(node, {
      host: 'https://www.youtube.com',
      width: '100%',
      height: '100%',
      videoId: track.id,
      playerVars: { autoplay: 0, playsinline: 1, origin: location.origin, controls: 1 },
      events: {
        onReady(event) {
          if (seq !== generation) return
          loadedId = track.queueId
          event.target.getIframe().tabIndex = -1
          event.target.getIframe().referrerPolicy = 'strict-origin-when-cross-origin'
          applyVolume()
          if (start > 0) event.target.seekTo(start, true)
          void sync()
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED && seq === generation)
            void report('ended', track.queueId)
        },
        onError(event) {
          if (seq !== generation) return
          loadedId = track.queueId
          pendingYoutubeError = { id: track.queueId, code: event.data }
          void prepare()
          warning.value = armed.value
            ? ''
            : 'O YouTube retornou erro ' + event.data + '. Ative o som para conferir a reprodução.'
          void report('error', track.queueId, undefined, undefined, event.data)
        },
        onAutoplayBlocked() {
          if (seq !== generation) return
          warning.value = 'Ative o som ou use o botão de play do vídeo.'
        },
      },
    })
  } catch (error) {
    warning.value = errorText(error)
  }
}
function localReady(element: HTMLAudioElement) {
  if (element.dataset.queueId !== current.value?.queueId) return
  loadedId = element.dataset.queueId
  if (state.value?.position)
    element.currentTime = Math.min(state.value.position, Math.max(0, element.duration - 0.1))
  applyVolume()
  if (sink.value) void changeSink()
  void sync()
}
async function activate() {
  armSound()
  void unlockMusic()
  void prepare()
  warning.value = ''
  if (pendingYoutubeError && pendingYoutubeError.id === current.value?.queueId) {
    await report('error', pendingYoutubeError.id, undefined, undefined, pendingYoutubeError.code)
    return
  }
  await sync()
}
function pageVisibility() {
  pageVisible.value = !document.hidden
  if (document.hidden) {
    yt?.pauseVideo?.()
  } else void sync()
}
async function listOutputs() {
  if (!window.isSecureContext || !audio.value || !('setSinkId' in audio.value)) {
    warning.value =
      'Selecione a saída pelo sistema operacional. A escolha pelo app exige navegador compatível e localhost ou HTTPS.'
    return
  }
  try {
    outputs.value = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audiooutput',
    )
  } catch (error) {
    warning.value = errorText(error)
  }
}
async function changeSink() {
  try {
    await audio.value?.setSinkId(sink.value)
    sessionStorage.setItem('qroke:audio-output', sink.value)
  } catch (error) {
    warning.value = errorText(error)
  }
}
watch([() => current.value?.queueId, isPlayer], () => void mountTrack(), { flush: 'post' })
watch(eligible, () => void sync(), { flush: 'post' })
watch(slot, (element, previous) => {
  if (previous) observer?.unobserve(previous)
  if (element) observer?.observe(element)
})
function releaseAudio(element: HTMLAudioElement | null) {
  if (!element) return
  element.pause()
  element.removeAttribute('src')
  element.load()
}
watch(audio, (element, previous) => {
  if (previous && previous !== element) releaseAudio(previous)
})
onMounted(() => {
  try {
    sink.value = sessionStorage.getItem('qroke:audio-output') || ''
  } catch {}
  void mountTrack()
  observer = new IntersectionObserver(
    (entries) => {
      inView.value = (entries[0]?.intersectionRatio || 0) > 0.6
    },
    { threshold: [0, 0.6, 1] },
  )
  pageVisible.value = !document.hidden
  if (slot.value) observer.observe(slot.value)
  document.addEventListener('visibilitychange', pageVisibility)
  timer = setInterval(async () => {
    clock.value = Date.now()
    void prepare()
    if (!safe.value) {
      yt?.pauseVideo?.()
      audio.value?.pause()
      return
    }
    if (reporting || !current.value || !armed.value || loadedId !== current.value.queueId) return
    const position = yt?.getCurrentTime?.() ?? audio.value?.currentTime ?? 0,
      duration = yt?.getDuration?.() ?? audio.value?.duration ?? 0
    if (!Number.isFinite(duration) || !Number.isFinite(position)) return
    // Alguns navegadores chegam ao fim do áudio sem emitir ended.
    // Só recupera o último centésimo de segundo após pelo menos dois segundos estáveis.
    const atLocalEnd =
      current.value.source === 'local' &&
      eligible.value &&
      audio.value &&
      !audio.value.seeking &&
      (audio.value.ended || !audio.value.paused) &&
      duration > 0 &&
      position >= duration - 0.01
    if (!atLocalEnd) localFinish = undefined
    else if (!localFinish || localFinish.id !== current.value.queueId)
      localFinish = { id: current.value.queueId, at: Date.now() }
    else if (Date.now() - localFinish.at >= 2000) {
      const id = localFinish.id
      localFinish = undefined
      reporting = true
      await report('ended', id)
      reporting = false
      return
    }
    reporting = true
    await report('progress', current.value.queueId, position, duration)
    reporting = false
  }, 1000)
})
onBeforeUnmount(() => {
  generation++
  yt?.destroy()
  releaseAudio(audio.value)
  observer?.disconnect()
  clearInterval(timer)
  document.removeEventListener('visibilitychange', pageVisibility)
})
defineExpose({ activate })
</script>
<template>
  <section v-if="isPlayer" class="media-player">
    <div v-if="route.path !== '/player'" class="player-activation">
      <span class="eyebrow">● ESTE É O PLAYER</span
      ><button class="primary-button" aria-label="Ativar som" @click="activate">
        {{ armed ? 'Ativar som novamente' : '▶ Ativar som' }}
      </button>
    </div>
    <p v-if="armed && !current" class="hint">
      Som ativado. O próximo pedido começa automaticamente.
    </p>
    <p v-if="!safe" class="notice">Aguardando conexão ou transferência do PLAYER…</p>
    <p v-if="warning" role="status" class="notice">{{ warning }}</p>
    <KaraokeCountdown v-if="route.path !== '/player'" />
    <div
      v-show="!karaokeWaiting"
      ref="slot"
      class="media-slot"
      :style="docked ? { height: slotHeight + 'px' } : undefined"
    >
      <div
        class="media-shell"
        :class="{
          'player-floating': docked,
          'player-covered': adminDialogOpen && current?.source === 'youtube',
        }"
      >
        <div class="media-viewport" :class="{ 'local-media': current?.source === 'local' }">
          <div v-if="current?.source === 'youtube'" ref="frame" class="youtube-frame" />
          <div v-else-if="current?.source === 'local'" class="local-player">
            <span class="vinyl">♫</span>
            <h2>{{ current.title }}</h2>
            <p>{{ current.artist }}</p>
            <audio
              ref="audio"
              :key="current.queueId"
              :data-queue-id="current.queueId"
              :src="'/api/library/' + current.id"
              :controls="route.path !== '/player'"
              preload="metadata"
              @loadedmetadata="localReady($event.target as HTMLAudioElement)"
              @ended="report('ended', ($event.target as HTMLAudioElement).dataset.queueId)"
              @error="report('error', ($event.target as HTMLAudioElement).dataset.queueId)"
            />
          </div>
          <div v-else class="empty-player">
            <BrandLogo tone="dark" class="standby-brand" />
            <h2>Esperando a próxima música</h2>
            <p>A fila começa assim que alguém fizer um pedido.</p>
          </div>
        </div>
        <div v-if="docked" class="floating-controls">
          <span>{{ current?.title }}</span>
          <button @click="returnToPlayer" aria-label="Voltar ao player na página">↗ Voltar</button>
        </div>
      </div>
    </div>
    <Transition name="track" mode="out-in">
      <div v-if="current" :key="current.queueId" class="player-caption">
        <strong>{{ current.title }}</strong
        ><span>{{ current.artist }} · {{ current.guestName }}</span>
        <PlaylistBadge :playlist="current.playlist" />
        <KaraokeSingers
          v-if="current.karaoke"
          :people="current.singers"
          :fallback="current.guestName"
        />
      </div>
    </Transition>
    <div v-if="current?.source === 'local' && route.path !== '/player'" class="audio-output">
      <button @click="listOutputs">Escolher saída de áudio</button
      ><select
        v-if="outputs.length"
        v-model="sink"
        aria-label="Saída de áudio"
        @change="changeSink"
      >
        <option value="">Padrão do sistema</option>
        <option v-for="(output, index) in outputs" :key="output.deviceId" :value="output.deviceId">
          {{ output.label || 'Saída ' + (index + 1) }}
        </option>
      </select>
    </div>
  </section>
</template>
