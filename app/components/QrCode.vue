<script setup lang="ts">
import QRCode from 'qrcode'
import { partyUrl } from '../utils/party-url'
defineProps<{ large?: boolean }>()
const url = ref(''),
  svg = ref(''),
  ready = ref(false),
  config = useRuntimeConfig()
onMounted(async () => {
  url.value = partyUrl(config.public.partyUrl, location.origin) || ''
  if (url.value)
    svg.value = await QRCode.toString(url.value, {
      type: 'svg',
      margin: 4,
      color: { dark: '#111111', light: '#ffffff' },
    })
  ready.value = true
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
      configurar o acesso pela rede e recarregue esta página.
    </p>
    <p v-else role="status">Preparando convite…</p>
  </div>
</template>
