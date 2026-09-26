<script setup lang="ts">
import QRCode from 'qrcode'
import type { InviteStatus } from '../../shared/network'
import { partyUrl } from '../utils/party-url'
defineProps<{ large?: boolean }>()
const url = ref(''),
  svg = ref(''),
  ready = ref(false),
  checking = ref(false),
  warning = ref(''),
  message = ref('')
const config = useRuntimeConfig()
let timer: ReturnType<typeof setInterval>
let disposed = false
let controller: AbortController | undefined
async function generate(value: string) {
  if (value === url.value && svg.value) return
  url.value = value
  if (!value) {
    svg.value = ''
    return
  }
  try {
    const next = await QRCode.toString(value, {
      type: 'svg',
      margin: 4,
      color: { dark: '#111111', light: '#ffffff' },
    })
    if (!disposed && url.value === value) svg.value = next
  } catch {
    svg.value = ''
    warning.value = 'Não foi possível gerar o QR. Tentaremos novamente.'
  }
}
async function check() {
  if (checking.value || disposed) return
  checking.value = true
  controller = new AbortController()
  try {
    const status = await $fetch<InviteStatus>('/api/network/invite', {
      timeout: 10000,
      signal: controller.signal,
    })
    if (disposed) return
    await generate(
      status.url || (status.status === 'unconfigured' ? partyUrl('', location.origin) || '' : ''),
    )
    warning.value = status.status === 'unreachable' ? status.message : ''
    message.value = ['ok', 'updated'].includes(status.status) ? status.message : ''
  } catch {
    if (!disposed)
      warning.value =
        'Sem contato com o servidor. Reconecte à rede; o convite será verificado novamente.'
  } finally {
    checking.value = false
    ready.value = true
  }
}
const online = () => {
  void check()
}
const visible = () => {
  if (!document.hidden) void check()
}
onMounted(async () => {
  await generate(partyUrl(config.public.partyUrl, location.origin) || '')
  ready.value = true
  void check()
  timer = setInterval(check, 30000)
  window.addEventListener('online', online)
  document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(timer)
  controller?.abort()
  window.removeEventListener('online', online)
  document.removeEventListener('visibilitychange', visible)
})
</script>
<template>
  <div class="qr-card" :class="{ large }">
    <template v-if="svg">
      <div class="qr-plate" role="img" :aria-label="'QR para ' + url" v-html="svg" />
      <p>Conecte-se ao mesmo Wi-Fi. Escaneie. Escolha. Cante.</p>
      <a :href="url">{{ url }}</a>
    </template>
    <p v-else-if="ready" class="notice" role="status">
      O endereço desta festa ainda não está disponível para o celular. Peça ao anfitrião para
      configurar o acesso pela rede.
    </p>
    <p v-else role="status">Preparando convite…</p>
    <div v-if="large" class="qr-network">
      <p v-if="warning" class="notice" role="status">{{ warning }}</p>
      <p v-else-if="message" class="hint" role="status">{{ message }}</p>
      <button :disabled="checking" @click="check">
        {{ checking ? 'Verificando rede…' : 'Verificar acesso' }}
      </button>
      <small>Verificação automática a cada 30 segundos.</small>
    </div>
    <span v-else-if="warning" class="qr-network-warning" :title="warning" role="status"
      >Verifique a rede</span
    >
  </div>
</template>
<style scoped>
.qr-network {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  max-width: 390px;
}
.qr-network .notice {
  font-size: 12px;
}
.qr-network small {
  display: block;
}
.qr-network-warning {
  color: var(--coral);
  font-size: 10px;
}
</style>
