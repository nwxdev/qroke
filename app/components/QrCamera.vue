<script setup lang="ts">
const emit = defineEmits<{ read: [value: string] }>()
const video = ref<HTMLVideoElement | null>(null)
const status = ref<'requesting' | 'scanning' | 'paused' | 'error'>('requesting')
const message = ref('Aguardando sua permissão para abrir a câmera…')
const permissionHelp = ref(false)
const devices = ref<MediaDeviceInfo[]>([])
const selected = ref('')
let stream: MediaStream | null = null
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
let helpTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
const ios = ref(false)
const standalone = ref(false)
function stop() {
  generation++
  clearTimeout(timer)
  clearTimeout(helpTimer)
  stream?.getTracks().forEach((track) => {
    track.onended = null
    track.stop()
  })
  stream = null
  if (video.value) {
    video.value.pause()
    video.value.srcObject = null
  }
}
function failed(error: unknown) {
  const name = (error as { name?: string })?.name
  permissionHelp.value = name === 'NotAllowedError' || name === 'SecurityError'
  message.value = permissionHelp.value
    ? 'A câmera não foi autorizada. Libere o acesso nas configurações ou entre com o link.'
    : name === 'NotFoundError'
      ? 'Não encontramos uma câmera neste aparelho. Você pode entrar com o link.'
      : name === 'NotReadableError' || name === 'AbortError'
        ? 'Não foi possível abrir a câmera. Feche outros aplicativos que possam estar usando-a.'
        : name === 'OverconstrainedError'
          ? 'Esta câmera não está disponível. Escolha outra ou use o link.'
          : 'Não foi possível iniciar a leitura. Tente novamente ou use o link.'
  status.value = 'error'
}
async function start() {
  stop()
  const attempt = generation
  status.value = 'requesting'
  permissionHelp.value = false
  message.value = 'Aguardando sua permissão para abrir a câmera…'
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    status.value = 'error'
    message.value = !window.isSecureContext
      ? 'Para usar a câmera, abra o QRokê por HTTPS. Você também pode colar o link da festa.'
      : 'Este navegador não permite abrir a câmera. Abra no Safari ou Chrome, ou use o link.'
    return
  }
  helpTimer = setTimeout(() => {
    if (attempt === generation && status.value === 'requesting')
      message.value =
        'Confira o pedido de permissão do navegador. Se preferir, volte e cole o link.'
  }, 10000)
  try {
    const captured = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: selected.value
        ? { deviceId: { exact: selected.value } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    if (disposed || attempt !== generation) {
      captured.getTracks().forEach((track) => track.stop())
      return
    }
    stream = captured
    const decoder = (await import('jsqr')).default
    if (disposed || attempt !== generation) return
    const element = video.value
    if (!element) {
      stop()
      return
    }
    element.srcObject = captured
    await element.play()
    if (disposed || attempt !== generation) return
    clearTimeout(helpTimer)
    devices.value = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter(
      (item) => item.kind === 'videoinput' && item.deviceId,
    )
    if (disposed || attempt !== generation) return
    selected.value = captured.getVideoTracks()[0]?.getSettings().deviceId || ''
    for (const track of captured.getTracks())
      track.onended = () => {
        stop()
        status.value = 'error'
        message.value = 'A câmera foi desconectada. Tente novamente ou use o link.'
      }
    status.value = 'scanning'
    message.value = 'Aponte para o QR Code da festa.'
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('canvas-unavailable')
    function scan() {
      if (attempt !== generation || disposed) return
      try {
        if (element!.readyState >= 2 && element!.videoWidth && element!.videoHeight) {
          const scale = Math.min(1, 640 / Math.max(element!.videoWidth, element!.videoHeight))
          canvas.width = Math.max(1, Math.round(element!.videoWidth * scale))
          canvas.height = Math.max(1, Math.round(element!.videoHeight * scale))
          context!.drawImage(element!, 0, 0, canvas.width, canvas.height)
          const pixels = context!.getImageData(0, 0, canvas.width, canvas.height)
          const code = decoder(pixels.data, pixels.width, pixels.height, {
            inversionAttempts: 'attemptBoth',
          })
          if (code?.data) {
            stop()
            emit('read', code.data)
            return
          }
        }
        timer = setTimeout(scan, 180)
      } catch (error) {
        stop()
        failed(error)
      }
    }
    scan()
  } catch (error) {
    if (attempt !== generation || disposed) return
    stop()
    failed(error)
  }
}
function hidden() {
  if (!document.hidden || (!stream && status.value !== 'requesting')) return
  stop()
  status.value = 'paused'
  message.value = 'Câmera pausada ao sair desta tela.'
}
function pageLeaving() {
  stop()
  status.value = 'paused'
  message.value = 'Câmera pausada ao sair desta tela.'
}
onMounted(() => {
  ios.value =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  standalone.value =
    matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  document.addEventListener('visibilitychange', hidden)
  window.addEventListener('pagehide', pageLeaving)
  void start()
})
onBeforeUnmount(() => {
  disposed = true
  stop()
  document.removeEventListener('visibilitychange', hidden)
  window.removeEventListener('pagehide', pageLeaving)
})
</script>
<template>
  <section class="qr-camera" aria-label="Leitor de QR Code">
    <video
      ref="video"
      autoplay
      muted
      playsinline
      :class="{ inactive: status === 'error' || status === 'paused' }"
      aria-label="Prévia da câmera"
    />
    <p role="status">{{ message }}</p>
    <label v-if="devices.length > 1" class="camera-choice">
      Câmera
      <select v-model="selected" :disabled="status === 'requesting'" @change="start">
        <option v-for="(item, index) in devices" :key="item.deviceId" :value="item.deviceId">
          {{ item.label || 'Câmera ' + (index + 1) }}
        </option>
      </select>
    </label>
    <details v-if="permissionHelp">
      <summary>Como liberar a câmera</summary>
      <p v-if="ios">
        No iPhone, confira a permissão de câmera nos ajustes do Safari e deste site. Se estiver
        bloqueada, permita o acesso e tente novamente.
      </p>
      <p v-else>
        Abra as permissões de qroke.com.br no ícone ao lado do endereço e permita a câmera. Confira
        também a permissão de câmera do navegador nas configurações do aparelho.
      </p>
      <p v-if="standalone">
        No aplicativo instalado, se a permissão não aparecer, abra qroke.com.br no navegador e tente
        por lá.
      </p>
      <p>Se abriu pelo WhatsApp ou Instagram, abra o link no Safari ou Chrome.</p>
    </details>
    <button v-if="status === 'error' || status === 'paused'" type="button" @click="start">
      {{ status === 'paused' ? 'Retomar câmera' : 'Tentar câmera novamente' }}
    </button>
    <small
      >A leitura acontece neste aparelho. Nenhuma imagem é enviada e o microfone não é usado.</small
    >
  </section>
</template>
<style scoped>
.qr-camera {
  display: grid;
  gap: 12px;
}
video {
  display: block;
  width: 100%;
  height: clamp(150px, 27dvh, 240px);
  object-fit: cover;
  background: #080909;
  border-radius: 12px;
}
video.inactive {
  display: none;
}
p {
  margin: 0;
}
select {
  width: 100%;
  min-width: 0;
  margin-top: 6px;
}
.camera-choice {
  min-width: 0;
}
details {
  border: 1px solid var(--line);
  padding: 12px;
  border-radius: 10px;
}
summary {
  cursor: pointer;
}
details p {
  margin-top: 10px;
  font-size: 13px;
}
small {
  font-size: 12px;
}
</style>
