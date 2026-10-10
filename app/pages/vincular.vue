<script setup lang="ts">
const code = ref(''),
  busy = ref(false),
  failure = ref('')
async function accept() {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  try {
    const result = await $fetch<{ url: string }>('/api/session-link/accept', {
      method: 'POST',
      body: { code: code.value.trim() },
    })
    await navigateTo(result.url, { external: true })
  } catch (error) {
    failure.value = errorText(error)
    busy.value = false
  }
}
</script>
<template>
  <main class="link-page panel">
    <NuxtLink to="/"><BrandLogo /></NuxtLink>
    <h1>Retome sua festa</h1>
    <p>
      No navegador onde a festa está aberta, abra “Vincular esta sessão ao aplicativo” no menu. Gere
      o código e cole aqui.
    </p>
    <form @submit.prevent="accept">
      <label for="session-code">Código de vinculação</label>
      <input
        id="session-code"
        v-model="code"
        required
        maxlength="22"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button :disabled="busy || code.trim().length !== 22">
        {{ busy ? 'Vinculando…' : 'Retomar sessão' }}
      </button>
    </form>
    <p v-if="failure" role="alert">{{ failure }}</p>
  </main>
</template>
<style scoped>
.link-page {
  max-width: 480px;
  margin: 10vh auto;
  padding: 24px;
}
.link-page h1 {
  margin-top: 24px;
}
.link-page form {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}
.link-page input {
  min-width: 0;
  width: 100%;
}
</style>
