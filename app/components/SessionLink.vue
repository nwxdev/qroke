<script setup lang="ts">
const { id } = usePartyRoute()
const request = usePartyFetch()
const code = ref(''),
  busy = ref(false),
  failure = ref(''),
  expiresAt = ref(0)
async function generate() {
  busy.value = true
  failure.value = ''
  try {
    const result = await request<{ code: string; expiresIn: number }>('/api/session-link', {
      method: 'POST',
      body: {},
    })
    code.value = result.code
    expiresAt.value = Date.now() + result.expiresIn * 1000
  } catch (error) {
    failure.value = errorText(error)
  } finally {
    busy.value = false
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(code.value)
  } catch {
    failure.value = 'Selecione e copie o código abaixo.'
  }
}
</script>
<template>
  <details v-if="id" class="session-link">
    <summary>Vincular esta sessão ao aplicativo</summary>
    <p>
      Se o aplicativo não retomou a festa, gere um código aqui. Abra o QRokê instalado, escolha
      “Vincular sessão” na página inicial e cole o código.
    </p>
    <p>
      O código vale por 5 minutos e uma utilização. Ele dá acesso à sua sessão desta festa; use
      apenas nos seus aparelhos.
    </p>
    <button :disabled="busy" @click="generate">Gerar código de vinculação</button>
    <div v-if="code">
      <input :value="code" readonly aria-label="Código de vinculação" /><button @click="copy">
        Copiar código
      </button>
      <small>Válido até {{ new Date(expiresAt).toLocaleTimeString('pt-BR') }}</small>
    </div>
    <p v-if="failure" role="alert">{{ failure }}</p>
  </details>
</template>
<style scoped>
.session-link {
  width: min(100%, 680px);
  margin: 20px auto;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.session-link summary {
  cursor: pointer;
}
.session-link p {
  margin: 12px 0;
}
.session-link div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.session-link input {
  min-width: 0;
  max-width: 100%;
}
.session-link small {
  width: 100%;
}
</style>
