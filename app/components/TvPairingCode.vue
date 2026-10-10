<script setup lang="ts">
const $fetch = usePartyFetch()
const code = ref(''),
  expires = ref(0),
  now = ref(Date.now()),
  offset = ref(0),
  busy = ref(false),
  failure = ref('')
const left = computed(() =>
  Math.max(0, Math.ceil((expires.value - now.value - offset.value) / 1000)),
)
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
async function generate() {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  try {
    const result = await $fetch<{ code: string; expires: number; serverTime: number }>(
      '/api/tv-code',
      { method: 'POST', body: {} },
    )
    code.value = result.code
    expires.value = result.expires
    now.value = Date.now()
    offset.value = result.serverTime - now.value
  } catch (error) {
    failure.value = errorText(error)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="tv-pairing">
    <h3>Conectar a TV por código</h3>
    <p>
      Na TV, abra <strong>qroke.com.br/tv</strong> e digite o código. Ela será o aparelho de som da
      festa.
    </p>
    <button type="button" :disabled="busy" @click="generate">
      <AppIcon name="tv" />
      {{ busy ? 'Gerando…' : code ? 'Gerar outro código' : 'Gerar código para TV' }}
    </button>
    <div v-if="code" class="tv-code-result" role="status">
      <template v-if="left"
        ><strong class="tv-pairing-code" aria-label="Código para TV">{{ code }}</strong
        ><small
          >Uso único · expira em {{ Math.floor(left / 60) }}:{{
            String(left % 60).padStart(2, '0')
          }}</small
        >
        <p>Depois de conectar, toque em Ativar som na TV.</p></template
      >
      <p v-else>Código expirado. Gere outro para conectar.</p>
    </div>
    <DismissibleNotice v-if="failure" class="notice" :message="failure" @close="failure = ''" />
  </section>
</template>
<style scoped>
.tv-pairing {
  margin: 18px 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.tv-pairing h3 {
  margin: 0 0 8px;
}
.tv-pairing button {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tv-code-result {
  margin-top: 14px;
}
.tv-pairing-code {
  display: block;
  font-size: 48px;
  letter-spacing: 0.18em;
  font-family: monospace;
  color: var(--accent);
}
</style>
