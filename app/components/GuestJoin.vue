<script setup lang="ts">
withDefaults(defineProps<{ host?: boolean; autofocus?: boolean }>(), { autofocus: true })
const { guest, pending, failure, act, api, sessionReady } = useParty()
const name = ref('')
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const ready = computed(() => mounted.value && sessionReady.value)
const googleFailure = useState('qroke:google-failure', () => '')
const nuxt = useNuxtApp()
const nameError = computed(() => {
  const n = name.value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()
  return Array.from(n).length >= 2 && Array.from(n).length <= 20 ? '' : 'Use de 2 a 20 caracteres.'
})
async function join() {
  if (!ready.value || nameError.value || pending.value) return false
  await act(() => api('/api/guest', { name: name.value }))
  return !!guest.value && !failure.value
}
async function connect() {
  await nuxt.$connectGoogle(join)
}
</script>
<template>
  <section class="join-card panel">
    <h2>{{ host ? 'Nome do anfitrião' : 'Qual é seu nome?' }}</h2>
    <form @submit.prevent="join">
      <QInput
        v-model="name"
        outlined
        :label="host ? 'Nome do anfitrião' : 'Seu nome'"
        maxlength="24"
        autocomplete="nickname"
        :autofocus="autofocus"
        :disable="pending || !ready"
      />
      <small v-if="name && nameError">{{ nameError }}</small>
      <QBtn
        type="submit"
        color="primary"
        no-caps
        :label="host ? 'Continuar' : 'Entrar na festa →'"
        :loading="pending"
        :disable="!!nameError || !ready"
      />
      <button
        type="button"
        class="google-connect"
        :disabled="pending || !!nameError || !ready"
        @click="connect"
      >
        Conectar Google e escolher playlists
      </button>
    </form>
    <small>Google é opcional. Você pode buscar músicas sem conectar.</small>
    <p v-if="failure || googleFailure" class="notice" role="alert">
      {{ failure || googleFailure }}
    </p>
  </section>
</template>
<style scoped>
.join-card h2 {
  margin-bottom: 18px;
}
.join-card form {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}
.google-connect {
  width: 100%;
  min-height: 46px;
}
</style>
