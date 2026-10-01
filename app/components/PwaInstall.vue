<script setup lang="ts">
const installed = useState('pwa-installed', () => false)
const dismissed = ref(false),
  help = ref(false),
  ios = ref(false),
  ready = ref(false)
const nuxt = useNuxtApp()
const bar = ref<HTMLElement | null>(null)
let resize: ResizeObserver | undefined
async function install() {
  try {
    if (await nuxt.$installPwa()) return
  } catch {}
  help.value = !help.value
}
function close() {
  dismissed.value = true
  try {
    sessionStorage.setItem('qroke:install-dismissed', '1')
  } catch {}
}
function measure() {
  document.documentElement.style.setProperty(
    '--qroke-install-space',
    (bar.value?.offsetHeight || 0) + 'px',
  )
}
watch([dismissed, installed, help], async () => {
  await nextTick()
  measure()
})
onMounted(() => {
  ios.value =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  try {
    dismissed.value = sessionStorage.getItem('qroke:install-dismissed') === '1'
  } catch {}
  ready.value = true
  void nextTick(() => {
    resize = new ResizeObserver(measure)
    if (bar.value) resize.observe(bar.value)
    measure()
  })
})
onBeforeUnmount(() => {
  resize?.disconnect()
  document.documentElement.style.removeProperty('--qroke-install-space')
})
</script>
<template>
  <div class="pwa-install-slot" :class="{ pending: !ready }">
    <aside
      v-if="ready && !installed && !dismissed"
      ref="bar"
      class="pwa-install"
      aria-label="Instalar aplicativo"
    >
      <div>
        <span>QRokê no seu celular</span
        ><button class="install-link" @click="install">Instalar QRokê</button
        ><button class="install-close" aria-label="Fechar convite de instalação" @click="close">
          ×
        </button>
      </div>
      <p v-if="help" role="status">
        {{
          ios
            ? 'No Safari, toque em Compartilhar e em Adicionar à Tela de Início.'
            : 'No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial. Se a opção não aparecer, abra este link no Chrome ou Edge.'
        }}
      </p>
    </aside>
  </div>
</template>
<style scoped>
.pwa-install-slot {
  position: sticky;
  top: 0;
  z-index: 40;
}
.pwa-install-slot.pending {
  height: 45px;
}
.pwa-install {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 4px 16px;
  color: var(--text);
}
.pwa-install > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 36px;
}
.pwa-install span {
  font-size: 12px;
}
.pwa-install button {
  min-height: 36px;
  padding: 4px 8px;
  font-size: 12px;
}
.install-link {
  color: var(--accent);
  border: 0;
  text-decoration: underline;
}
.install-close {
  border: 0;
  font-size: 22px !important;
}
.pwa-install p {
  max-width: 620px;
  margin: 4px auto 10px;
  font-size: 13px;
}
</style>
