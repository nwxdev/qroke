<script setup lang="ts">
const active = ref(false),
  supported = ref(false),
  busy = ref(false),
  failure = ref('')
function sync() {
  active.value = !!document.fullscreenElement
}
async function toggle() {
  if (busy.value || !supported.value) return
  busy.value = true
  failure.value = ''
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    failure.value = 'Este navegador não permitiu entrar em tela cheia.'
  } finally {
    sync()
    busy.value = false
  }
}
onMounted(() => {
  supported.value = !!document.documentElement.requestFullscreen
  sync()
  document.addEventListener('fullscreenchange', sync)
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', sync))
</script>
<template>
  <button
    class="icon-button fullscreen-toggle"
    :aria-label="active ? 'Restaurar tela' : 'Expandir tela'"
    :aria-pressed="active"
    :disabled="!supported || busy"
    :title="
      failure ||
      (!supported
        ? 'Tela cheia indisponível neste navegador'
        : active
          ? 'Restaurar tela'
          : 'Expandir tela')
    "
    @click="toggle"
  >
    <AppIcon :name="active ? 'fullscreen-exit' : 'fullscreen'" />
  </button>
</template>
