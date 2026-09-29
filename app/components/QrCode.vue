<script setup lang="ts">
import QRCode from 'qrcode'
import type { InviteStatus } from '../../shared/network'
import { partyUrl } from '../utils/party-url'
defineProps<{ large?: boolean; presentation?: boolean }>()
const url = ref(''),
  svg = ref(''),
  ready = ref(false),
  checking = ref(false),
  warning = ref(''),
  message = ref('')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout>
async function copyLink() {
  if (!url.value) return
  try {
    if (navigator.clipboard && window.isSecureContext)
      await navigator.clipboard.writeText(url.value)
    else {
      const field = document.createElement('textarea')
      field.value = url.value
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.append(field)
      field.select()
      const ok = document.execCommand('copy')
      field.remove()
      if (!ok) throw new Error('copy')
    }
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    warning.value = 'Toque e segure no link para copiar o endereço da festa.'
  }
}
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
      status.status === 'unreachable'
        ? ''
        : status.url ||
            (status.status === 'unconfigured' ? partyUrl('', location.origin) || '' : ''),
    )
    warning.value = status.status === 'unreachable' ? status.message : ''
    message.value = ['ok', 'updated'].includes(status.status) ? status.message : ''
  } catch {
    if (!disposed) {
      await generate('')
      message.value = ''
      warning.value =
        'Sem contato com o servidor. Reconecte à rede; o convite será verificado novamente.'
    }
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
onMounted(() => {
  void check()
  timer = setInterval(check, 30000)
  window.addEventListener('online', online)
  document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(timer)
  clearTimeout(copiedTimer)
  controller?.abort()
  window.removeEventListener('online', online)
  document.removeEventListener('visibilitychange', visible)
})
</script>
<template>
  <div class="qr-card" :class="{ large, presentation }">
    <template v-if="svg">
      <div class="qr-plate" role="img" :aria-label="'QR para ' + url" v-html="svg" />
      <BrandLogo class="invite-brand" />
      <p v-if="!presentation">Conecte-se ao mesmo Wi-Fi. Escaneie. Escolha. Cante.</p>
      <a :href="url" class="invite-link">{{ url }}</a>
    </template>
    <p v-else-if="ready" class="notice" role="status">
      O endereço desta festa ainda não está disponível para o celular. Peça ao anfitrião para
      configurar o acesso pela rede.
    </p>
    <p v-else role="status">Preparando convite…</p>
    <div class="qr-network">
      <p v-if="warning" class="notice" role="status">{{ warning }}</p>
      <p v-else-if="message && large && !presentation" class="hint" role="status">{{ message }}</p>
      <div class="qr-actions">
        <button
          v-if="svg"
          class="copy-invite"
          :aria-label="copied ? 'Link copiado' : 'Copiar link da festa'"
          @click="copyLink"
        >
          <AppIcon v-if="presentation" :name="copied ? 'check' : 'link'" />
          {{ copied ? 'Copiado' : presentation ? 'Copiar link' : 'Copiar link da festa' }}
        </button>
        <button
          :disabled="checking"
          :aria-label="checking ? 'Verificando rede…' : 'Verificar acesso'"
          @click="check"
        >
          <AppIcon v-if="presentation" name="qr" />
          {{ presentation ? 'Rede' : checking ? 'Verificando rede…' : 'Verificar acesso' }}
        </button>
      </div>
      <small v-if="large && !presentation"
        >Verificação automática a cada 30 segundos. O teste confirma o acesso pelo servidor; redes
        de convidados ou isolamento do Wi-Fi podem bloquear outros aparelhos.</small
      >
    </div>
  </div>
</template>
<style scoped>
.invite-brand {
  --brand-logo-width: 164px;
  margin: 0 auto 8px;
}
.large .invite-brand {
  --brand-logo-width: 210px;
}

.copy-invite {
  display: block;
  margin: 10px auto 0;
  font-size: 11px;
}
.qr-network {
  margin-inline: auto;
}
.qr-card:not(.large) .qr-network {
  margin-top: 8px;
}
.qr-card:not(.large) .qr-network button {
  font-size: 11px;
  padding: 5px 8px;
}
.qr-network .notice {
  overflow-wrap: anywhere;
}

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
.qr-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}
.qr-actions .copy-invite {
  margin: 0;
}
.presentation .invite-brand {
  --brand-logo-width: 144px;
}
.presentation .qr-network {
  margin-top: 12px;
}
.presentation .qr-actions button {
  font-size: 11px;
  padding: 6px 8px;
}
.presentation .qr-actions .app-icon {
  width: 16px;
  height: 16px;
}
.presentation .invite-link {
  display: block;
  font-size: 12px;
  line-height: 1.4;
}
</style>
