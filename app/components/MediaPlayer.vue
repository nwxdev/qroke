<script setup lang="ts">
/// <reference types="youtube" />
const { state, isPlayer, api, lastContact } = useParty()
const route = useRoute()
const frame = ref<HTMLDivElement | null>(null),
  viewport = ref<HTMLElement | null>(null),
  audio = ref<HTMLAudioElement | null>(null)
const armed = ref(false),
  warning = ref(''),
  visible = ref(true),
  outputs = ref<MediaDeviceInfo[]>([]),
  sink = ref(''),
  clock = ref(Date.now())
let loadedId: string | undefined
let yt: YT.Player | undefined,
  observer: IntersectionObserver | undefined,
  timer: ReturnType<typeof setInterval>,
  generation = 0,
  reporting = false
const current = computed(() => state.value?.current)
const safe = computed(
  () =>
    isPlayer.value &&
    clock.value - lastContact.value < 8000 &&
    clock.value >= (state.value?.playerReadyAt || 0),
)
const eligible = computed(
  () =>
    armed.value &&
    (current.value?.source === 'local' || visible.value) &&
    safe.value &&
    !state.value?.paused,
)
async function report(
  action: 'ended' | 'error' | 'progress',
  id = current.value?.queueId,
  position?: number,
  duration?: number,
) {
  if (!id || !safe.value) return
  try {
    await api('/api/player', { action, queueId: id, position, duration })
  } catch {
    warning.value = 'Sem conexão com o servidor. Reconectando…'
  }
}
async function sync() {
  if (!eligible.value) {
    yt?.pauseVideo?.()
    audio.value?.pause()
    return
  }
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
          event.target.seekTo(start, true)
          void sync()
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED && seq === generation)
            void report('ended', track.queueId)
        },
        onError(event) {
          if (seq !== generation) return
          if ([2, 5, 100, 101, 150].includes(event.data)) {
            warning.value = 'Este vídeo não pode tocar aqui. Indo para a próxima…'
            void report('error', track.queueId)
          } else
            warning.value =
              'O YouTube recusou o player. Verifique o navegador, os cookies e o referenciador (erro ' +
              event.data +
              ').'
        },
        onAutoplayBlocked() {
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
  void sync()
}
async function activate() {
  armed.value = true
  warning.value = ''
  await sync()
}
function pageVisibility() {
  visible.value = !document.hidden
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
  } catch (error) {
    warning.value = errorText(error)
  }
}
watch(
  () => current.value?.queueId,
  () => void mountTrack(),
  { flush: 'post' },
)
watch(eligible, () => void sync())
onMounted(() => {
  void mountTrack()
  observer = new IntersectionObserver(
    (entries) => {
      visible.value = !document.hidden && (entries[0]?.intersectionRatio || 0) > 0.5
      void sync()
    },
    { threshold: [0, 0.5, 1] },
  )
  if (viewport.value) observer.observe(viewport.value)
  document.addEventListener('visibilitychange', pageVisibility)
  timer = setInterval(async () => {
    clock.value = Date.now()
    if (!safe.value) {
      yt?.pauseVideo?.()
      audio.value?.pause()
      return
    }
    if (reporting || !current.value || !armed.value || loadedId !== current.value.queueId) return
    const position = yt?.getCurrentTime?.() ?? audio.value?.currentTime ?? 0,
      duration = yt?.getDuration?.() ?? audio.value?.duration ?? 0
    if (!Number.isFinite(duration) || !Number.isFinite(position)) return
    reporting = true
    await report('progress', current.value.queueId, position, duration)
    reporting = false
  }, 1000)
})
onBeforeUnmount(() => {
  generation++
  yt?.destroy()
  audio.value?.pause()
  observer?.disconnect()
  clearInterval(timer)
  document.removeEventListener('visibilitychange', pageVisibility)
})
</script>
<template>
  <section class="media-player">
    <div class="player-activation">
      <span class="eyebrow">● ESTE É O PLAYER</span
      ><button class="primary-button" aria-label="Ativar som" @click="activate">
        {{ armed ? 'Ativar som novamente' : '▶ Ativar som' }}
      </button>
    </div>
    <p v-if="!safe" class="notice">Aguardando conexão ou transferência do PLAYER…</p>
    <p v-if="warning" role="status" class="notice">{{ warning }}</p>
    <div
      ref="viewport"
      class="media-viewport"
      :class="{ 'local-media': current?.source === 'local' }"
    >
      <div v-if="current?.source === 'youtube'" ref="frame" class="youtube-frame" />
      <div v-else-if="current?.source === 'local'" class="local-player">
        <span class="vinyl">♫</span>
        <h2>{{ current.title }}</h2>
        <p>{{ current.artist }}</p>
        <audio
          ref="audio"
          :data-queue-id="current.queueId"
          :src="'/api/library/' + current.id"
          :controls="route.path !== '/tv'"
          preload="metadata"
          @loadedmetadata="localReady($event.target as HTMLAudioElement)"
          @ended="report('ended', ($event.target as HTMLAudioElement).dataset.queueId)"
          @error="report('error', ($event.target as HTMLAudioElement).dataset.queueId)"
        />
      </div>
      <div v-else class="empty-player">
        <span>♫</span>
        <h2>Esperando a próxima música</h2>
        <p>A fila começa assim que alguém fizer um pedido.</p>
      </div>
    </div>
    <div v-if="current" class="player-caption">
      <strong>{{ current.title }}</strong
      ><span>{{ current.artist }} · {{ current.guestName }}</span>
    </div>
    <div v-if="current?.source === 'local'" class="audio-output">
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
