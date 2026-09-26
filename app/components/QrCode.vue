<script setup lang="ts">
import QRCode from 'qrcode'
defineProps<{ large?: boolean }>()
const url = ref(''),
  svg = ref(''),
  config = useRuntimeConfig()
onMounted(async () => {
  url.value = config.public.partyUrl || location.origin
  svg.value = await QRCode.toString(url.value, {
    type: 'svg',
    margin: 4,
    color: { dark: '#111111', light: '#ffffff' },
  })
})
</script>
<template>
  <div class="qr-card" :class="{ large }">
    <div class="qr-plate" role="img" :aria-label="'QR para ' + url" v-html="svg" />
    <p>Escaneie. Escolha. Cante.</p>
    <a :href="url">{{ url }}</a>
  </div>
</template>
