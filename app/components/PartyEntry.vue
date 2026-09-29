<script setup lang="ts">
const pin = ref(''),
  failure = ref(''),
  pending = ref(false)
const route = useRoute()
async function enter() {
  if (pending.value) return
  pending.value = true
  failure.value = ''
  try {
    const query = new URLSearchParams(location.hash.slice(1))
    const token = query.get('convite')
    const partyId =
      query.get('festa') || (typeof route.query.festa === 'string' ? route.query.festa : undefined)
    const access = await $fetch<{ role: string }>('/api/access', {
      method: 'POST',
      body: token && !pin.value ? { token, partyId } : { pin: pin.value, partyId },
    })
    history.replaceState(null, '', '/entrar')
    sessionStorage.removeItem('qroke:device')
    if (access.role === 'owner')
      await $fetch('/api/auth', { method: 'POST', body: { action: 'login', pin: pin.value } })
    await navigateTo(access.role === 'owner' ? '/host' : '/busca', { external: true })
  } catch (error) {
    failure.value = errorText(error)
  } finally {
    pending.value = false
  }
}
onMounted(() => {
  if (location.hash.includes('convite=')) void enter()
})
</script>
<template>
  <main class="entry-card">
    <BrandLogo />
    <h1>Entre na festa</h1>
    <p class="entry-description">
      Escolha músicas, compartilhe playlists e cante karaokê com seus amigos. No QRokê, cada
      convidado participa da fila pelo QR Code.
    </p>
    <p>Recebeu um convite? Abra o link ou escaneie o QR do anfitrião.</p>
    <form @submit.prevent="enter">
      <label for="host-pin">Acesso do anfitrião</label>
      <input
        id="host-pin"
        v-model="pin"
        type="password"
        inputmode="numeric"
        maxlength="8"
        autocomplete="current-password"
        placeholder="PIN do anfitrião"
      />
      <button :disabled="pending || !pin">
        {{ pending ? 'Entrando…' : 'Entrar como anfitrião' }}
      </button>
    </form>
    <p v-if="failure" role="alert">{{ failure }}</p>
  </main>
</template>
<style scoped>
.entry-card {
  max-width: 440px;
  margin: 12vh auto;
  padding: 28px;
}
.entry-description {
  margin-block: 20px 12px;
}
form {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}
input {
  padding: 12px;
  border-radius: 8px;
}
</style>
