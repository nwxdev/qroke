<script setup lang="ts">
const installed = useState('pwa-installed', () => false)
const standalone = useState('pwa-standalone', () => false)
const help = ref(false),
  ios = ref(false),
  tv = ref(false),
  opening = ref(false)
const nuxt = useNuxtApp()
const route = useRoute()
const target = computed(() => route.fullPath)
async function install() {
  try {
    if (await nuxt.$installPwa()) return
  } catch {}
  help.value = true
}
onMounted(() => {
  ios.value =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  tv.value = /AFT|SmartTV|HbbTV/i.test(navigator.userAgent)
})
</script>
<template>
  <section v-if="!tv" class="pwa-menu" aria-label="Aplicativo QRokê">
    <p v-if="standalone" class="pwa-open"><AppIcon name="check" /> Você já está no aplicativo</p>
    <a
      v-else-if="installed"
      :href="target"
      target="_blank"
      rel="noopener"
      class="pwa-action"
      @click="opening = true"
    >
      <AppIcon name="arrow-right" /> Abrir QRokê
    </a>
    <button v-else type="button" class="pwa-action" @click="install">
      <AppIcon name="plus" /> Instalar QRokê
    </button>
    <DismissibleNotice
      v-if="help"
      :message="
        ios
          ? 'No Safari, toque em Compartilhar e em Adicionar à Tela de Início. Se já instalou, abra o QRokê pelo ícone na tela inicial.'
          : 'No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial. Se já instalou, use Abrir no aplicativo na barra de endereços ou o ícone do QRokê.'
      "
      @close="help = false"
      role="status"
    />
    <DismissibleNotice
      v-if="opening"
      message="Se o navegador abrir outra aba, use Abrir no aplicativo na barra de endereços ou o ícone do QRokê na tela inicial."
      @close="opening = false"
      role="status"
    />
  </section>
</template>
<style scoped>
.pwa-menu {
  width: min(100%, 680px);
  margin: 24px auto 0;
}
.pwa-action {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text);
}
.pwa-action .app-icon {
  color: var(--accent);
}
.pwa-open {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}
</style>
