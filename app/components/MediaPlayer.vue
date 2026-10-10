<script setup lang="ts">
import { describeMedia } from '#shared/media'
import type { YoutubeWindow } from '../composables/useYoutube'
const props = defineProps<{ playerWindow?: Window | null }>()
const { storageKey, id: activePartyId } = usePartyRoute()
/// <reference types="youtube" />
const { state, isPlayer, api, refresh, lastContact, device, soundDevice, armSound, clockOffset } =
  useParty()
const { waiting: karaokeWaiting } = useKaraokeCountdown()
const frame = ref<HTMLDivElement | null>(null),
  audio = ref<HTMLAudioElement | null>(null)
const armed = computed(() => !!device.value && soundDevice.value === device.value.id),
  warning = useState(storageKey('player-warning'), () => ''),
  warningKind = useState<'network' | 'activate' | 'load' | 'other'>(
    storageKey('player-warning-kind'),
    () => 'other',
  ),
  pageVisible = ref(true),
  outputs = ref<MediaDeviceInfo[]>([]),
  sink = ref(''),
  clock = ref(Date.now())
let loadedId: string | undefined
let seekOnStart = true
let relocation: { id: string; position: number } | undefined
let startPosition: number | undefined
let localFinish: { id: string; at: number } | undefined
let yt: YT.Player | undefined,
  timer: ReturnType<typeof setInterval>,
  generation = 0,
  reporting = false
let pendingEndId: string | undefined
let terminalId: string | undefined
let preparingId: string | undefined
let pendingYoutubeError: { id: string; code: number } | undefined
const current = computed(() => state.value?.current)
const playbackKind = computed(() =>
  current.value ? describeMedia(current.value).playback.kind : null,
)
const safe = computed(
  () =>
    isPlayer.value &&
    clock.value - lastContact.value < 8000 &&
    clock.value + clockOffset.value >= (state.value?.playerReadyAt || 0),
)
const eligible = computed(
  () =>
    armed.value &&
    (playbackKind.value === 'audio-file' || pageVisible.value) &&
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
    return false
  if (action !== 'progress') {
    if (!armed.value || terminalId === id) return false
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
    if (warningKind.value === 'network') warning.value = ''
    return true
  } catch {
    if (terminalId === id) terminalId = undefined
    warningKind.value = 'network'
    warning.value = 'Sem conexão com o servidor. Reconectando…'
    return false
  }
}
async function flushEnd() {
  const id = pendingEndId
  if (!id || id !== current.value?.queueId) return
  if (await report('ended', id)) {
    if (pendingEndId === id) pendingEndId = undefined
  }
}
function ended(id?: string) {
  if (!id || id !== current.value?.queueId || !armed.value || !isPlayer.value) return
  pendingEndId = id
  void flushEnd()
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
  if (pendingEndId === current.value?.queueId) {
    await flushEnd()
    return
  }
  applyVolume()
  if (seekOnStart && loadedId === current.value?.queueId) {
    const position = startPosition ?? state.value?.position ?? 0
    yt?.seekTo?.(position, true)
    if (audio.value && audio.value.readyState >= 1)
      audio.value.currentTime = Math.min(
        position,
        Math.max(0, audio.value.duration - 0.1) || position,
      )
    seekOnStart = false
  }
  yt?.playVideo?.()
  if (audio.value)
    try {
      await audio.value.play()
    } catch {
      warningKind.value = 'activate'
      warning.value = 'Toque em Ativar som para permitir a reprodução neste navegador.'
    }
}
async function mountTrack() {
  const seq = ++generation,
    track = current.value
  const transfer = state.value?.playerHandoff
  const release =
    !isPlayer.value && transfer && transfer.from === device.value?.id
      ? {
          handoffId: transfer.id,
          queueId: transfer.queueId,
          position: Math.max(
            0,
            Math.min(
              86400,
              yt?.getCurrentTime?.() ??
                audio.value?.currentTime ??
                (relocation?.id === transfer.queueId ? relocation.position : undefined) ??
                state.value?.position ??
                0,
            ),
          ),
        }
      : null
  // Destroying the iframe (or pausing native audio) completes the stop before acknowledging it.
  yt?.destroy()
  yt = undefined
  if (!isPlayer.value) releaseAudio(audio.value)
  if (release && Number.isFinite(release.position))
    void api('/api/player/release', release)
      .then(refresh)
      .catch(() => {})
  loadedId = undefined
  startPosition = relocation && relocation.id === track?.queueId ? relocation.position : undefined
  relocation = undefined
  seekOnStart = true
  localFinish = undefined
  terminalId = undefined
  pendingEndId = undefined
  pendingYoutubeError = undefined
  preparingId = undefined
  warning.value = ''
  if (!track || !isPlayer.value) return
  await nextTick()
  if (describeMedia(track).playback.kind === 'audio-file') {
    if (audio.value && audio.value.readyState >= 1) localReady(audio.value)
    return
  }
  if (describeMedia(track).playback.kind !== 'youtube-embed') {
    warning.value = 'Esta plataforma precisa de um player compatível.'
    return
  }
  try {
    let owner = window as YoutubeWindow
    if (props.playerWindow && frame.value) {
      const wrapper = props.playerWindow.document.createElement('iframe')
      wrapper.title = 'Vídeo da festa'
      wrapper.dataset.youtubeWindow = ''
      wrapper.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
      wrapper.allowFullscreen = true
      wrapper.referrerPolicy = 'strict-origin-when-cross-origin'
      wrapper.style.cssText = 'display:block;width:100%;height:100%;border:0;min-height:200px'
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Não foi possível abrir o vídeo. Tente novamente.')),
          10000,
        )
        wrapper.onload = () => {
          clearTimeout(timeout)
          resolve()
        }
        wrapper.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Não foi possível abrir o vídeo.'))
        }
        wrapper.src = location.origin + '/player-frame'
        frame.value!.replaceChildren(wrapper)
      })
      if (seq !== generation || !wrapper.contentWindow) return
      owner = wrapper.contentWindow as YoutubeWindow
    }
    await loadYoutube(owner)
    if (seq !== generation || !frame.value) return
    const node = owner.document.createElement('div')
    if (props.playerWindow) owner.document.body.replaceChildren(node)
    else frame.value.replaceChildren(node)
    const start = startPosition ?? state.value?.position ?? 0
    yt = new owner.YT!.Player(node, {
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
          if (event.data === owner.YT!.PlayerState.ENDED && seq === generation) ended(track.queueId)
        },
        onError(event) {
          if (seq !== generation) return
          loadedId = track.queueId
          pendingYoutubeError = { id: track.queueId, code: event.data }
          void prepare()
          warningKind.value = 'activate'
          warning.value = armed.value
            ? ''
            : 'O YouTube retornou erro ' + event.data + '. Ative o som para conferir a reprodução.'
          void report('error', track.queueId, undefined, undefined, event.data)
        },
        onAutoplayBlocked() {
          if (seq !== generation) return
          warningKind.value = 'activate'
          warning.value = 'Ative o som ou use o botão de play do vídeo.'
        },
      },
    })
  } catch (error) {
    if (seq !== generation) return
    warningKind.value = 'load'
    warning.value = errorText(error)
  }
}
function localReady(element: HTMLAudioElement) {
  if (element.dataset.queueId !== current.value?.queueId) return
  loadedId = element.dataset.queueId
  const position = startPosition ?? state.value?.position ?? 0
  if (position) element.currentTime = Math.min(position, Math.max(0, element.duration - 0.1))
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
  pageVisible.value = !(props.playerWindow || window).document.hidden
  if (!pageVisible.value) {
    yt?.pauseVideo?.()
  } else void sync()
}
function prepareRelocation() {
  if (current.value)
    relocation = {
      id: current.value.queueId,
      position: yt?.getCurrentTime?.() ?? audio.value?.currentTime ?? state.value?.position ?? 0,
    }
  generation++
  yt?.destroy()
  yt = undefined
}
async function finishRelocation() {
  pageVisible.value = !(props.playerWindow || window).document.hidden
  await mountTrack()
}
watch(
  () => props.playerWindow,
  (next, previous) => {
    previous?.document.removeEventListener('visibilitychange', pageVisibility)
    next?.document.addEventListener('visibilitychange', pageVisibility)
  },
)
async function retryWarning() {
  if (!isPlayer.value) return
  if (warningKind.value === 'activate') return activate()
  if (warningKind.value === 'load') return mountTrack()
  if (warningKind.value === 'network') {
    await refresh()
    clock.value = Date.now()
    await sync()
  }
}
async function listOutputs() {
  if (!window.isSecureContext || !audio.value || !('setSinkId' in audio.value)) {
    warningKind.value = 'other'
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
    sessionStorage.setItem(storageKey('qroke:audio-output'), sink.value)
  } catch (error) {
    warning.value = errorText(error)
  }
}
watch(
  [() => current.value?.queueId, isPlayer],
  () => {
    if (isPlayer.value) armSound()
    void mountTrack()
  },
  { flush: 'pre' },
)
watch(eligible, () => void sync(), { flush: 'post' })
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
    sink.value = sessionStorage.getItem(storageKey('qroke:audio-output')) || ''
  } catch {}
  if (isPlayer.value) armSound()
  void mountTrack()
  pageVisible.value = !document.hidden
  document.addEventListener('visibilitychange', pageVisibility)
  window.addEventListener('qroke:retry-media', retryWarning)
  window.addEventListener('qroke:activate-media', activate)
  timer = setInterval(async () => {
    clock.value = Date.now()
    void prepare()
    if (!safe.value) {
      yt?.pauseVideo?.()
      audio.value?.pause()
      return
    }
    if (reporting || !current.value || !armed.value || loadedId !== current.value.queueId) return
    if (pendingEndId === current.value.queueId) {
      reporting = true
      try {
        await flushEnd()
      } finally {
        reporting = false
      }
      return
    }
    const position = yt?.getCurrentTime?.() ?? audio.value?.currentTime ?? 0,
      duration = yt?.getDuration?.() ?? audio.value?.duration ?? 0
    if (!Number.isFinite(duration) || !Number.isFinite(position)) return
    // Alguns navegadores chegam ao fim do áudio sem emitir ended.
    // Só recupera o último centésimo de segundo após pelo menos dois segundos estáveis.
    const atLocalEnd =
      playbackKind.value === 'audio-file' &&
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
      pendingEndId = id
      await flushEnd()
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
  clearInterval(timer)
  document.removeEventListener('visibilitychange', pageVisibility)
  props.playerWindow?.document.removeEventListener('visibilitychange', pageVisibility)
  window.removeEventListener('qroke:retry-media', retryWarning)
  window.removeEventListener('qroke:activate-media', activate)
  warning.value = ''
})
defineExpose({ activate, prepareRelocation, finishRelocation })
</script>
<template>
  <section v-if="isPlayer" class="media-player">
    <div class="media-viewport" :class="{ 'local-media': playbackKind === 'audio-file' }">
      <div v-if="playbackKind === 'youtube-embed'" ref="frame" class="youtube-frame" />
      <div v-else-if="current && playbackKind === 'audio-file'" class="local-player">
        <h2>{{ current.title }}</h2>
        <audio
          ref="audio"
          :key="current.queueId"
          :data-queue-id="current.queueId"
          :src="
            (activePartyId ? '/api/f/' + activePartyId : '/api') +
            '/media/' +
            current.source +
            '/stream/' +
            encodeURIComponent(current.id)
          "
          controls
          preload="metadata"
          @loadedmetadata="localReady($event.target as HTMLAudioElement)"
          @ended="ended(($event.target as HTMLAudioElement).dataset.queueId)"
          @error="report('error', ($event.target as HTMLAudioElement).dataset.queueId)"
        />
        <div class="audio-output">
          <button @click="listOutputs">Escolher saída de áudio</button>
          <select
            v-if="outputs.length"
            v-model="sink"
            aria-label="Saída de áudio"
            @change="changeSink"
          >
            <option value="">Padrão do sistema</option>
            <option
              v-for="(output, index) in outputs"
              :key="output.deviceId"
              :value="output.deviceId"
            >
              {{ output.label || 'Saída ' + (index + 1) }}
            </option>
          </select>
        </div>
      </div>
      <div v-else class="empty-player">
        <BrandLogo tone="dark" class="standby-brand" />
        <h2>Escolha uma música</h2>
      </div>
    </div>
  </section>
</template>
