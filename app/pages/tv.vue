<script setup lang="ts">
const { id, href } = usePartyRoute()
if (id.value) await navigateTo(href('/player') + '?tv=1', { replace: true })
const code = ref(''),
  busy = ref(false),
  failure = ref('')
const field = ref<HTMLInputElement | null>(null)
const normalized = computed(() => code.value.trim().toUpperCase())
async function connect() {
  if (busy.value || !/^[A-HJ-NP-Z2-9]{4}$/.test(normalized.value)) return
  busy.value = true
  failure.value = ''
  try {
    const info = {
      ...(await browserDeviceInfo()),
      view: 'player',
      appVersion: useRuntimeConfig().public.appVersion,
    }
    const result = await $fetch<{
      partyId: string
      device: { id: string; token: string }
      url: string
    }>('/api/tv/connect', {
      method: 'POST',
      body: { code: normalized.value, info },
      timeout: 15000,
    })
    sessionStorage.setItem('qroke:device:' + result.partyId, JSON.stringify(result.device))
    await navigateTo(result.url, { external: true })
  } catch (error) {
    failure.value = errorText(error)
  } finally {
    busy.value = false
  }
}
onMounted(() => field.value?.focus())
</script>
<template>
  <main class="tv-entry">
    <header class="utility-header"><PartyBrand public-page /><HeaderMenu public-page /></header>
    <section>
      <span class="eyebrow">A FESTA NA TELA GRANDE</span>
      <h1>Entrar com a TV / Código</h1>
      <p>No celular, entre em Anfitrião → Onde o som toca → Gerar código para TV.</p>
      <form @submit.prevent="connect">
        <label for="tv-room-code">Código de 4 caracteres</label>
        <input
          id="tv-room-code"
          ref="field"
          v-model="code"
          maxlength="4"
          autocomplete="off"
          autocapitalize="characters"
          :spellcheck="false"
          placeholder="A7K2"
          :disabled="busy"
          aria-describedby="tv-code-help"
        />
        <button type="submit" :disabled="busy || !/^[A-HJ-NP-Z2-9]{4}$/.test(normalized)">
          {{ busy ? 'Conectando…' : 'Conectar TV' }}
        </button>
      </form>
      <p id="tv-code-help">
        Letras e números, sem acentos. O código expira em 5 minutos e funciona uma vez.
      </p>
      <DismissibleNotice v-if="failure" class="notice" :message="failure" @close="failure = ''" />
      <NuxtLink to="/">Voltar ao início</NuxtLink>
    </section>
  </main>
</template>
<style scoped>
.tv-entry {
  max-width: 880px;
  margin: 0 auto;
  padding: 5vh 7vw;
  min-height: 100vh;
}
.tv-entry section {
  margin-top: 5vh;
}
h1 {
  font-size: clamp(26px, 4vw, 44px);
}
p {
  font-size: clamp(16px, 2vw, 21px);
  line-height: 1.5;
}
form {
  display: grid;
  gap: 14px;
  max-width: 480px;
  margin: 24px 0;
}
input {
  width: 100%;
  text-transform: uppercase;
  font-family: monospace;
  font-size: 44px;
  letter-spacing: 0.18em;
}
button {
  min-height: 60px;
  font-size: 22px;
  background: var(--accent);
  color: var(--on-accent);
}
a {
  display: inline-block;
  padding: 14px 0;
}
</style>
