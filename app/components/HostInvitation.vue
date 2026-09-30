<script setup lang="ts">
const $fetch = usePartyFetch()
const { admin, act } = useParty()
const message = ref('')
async function rotate() {
  await act(async () => {
    await $fetch('/api/invite', { method: 'POST', body: {} })
    message.value =
      'Convite atualizado. Os convites anteriores foram encerrados. Atualize o QR para compartilhar.'
  })
}
</script>
<template>
  <section v-if="admin">
    <button @click="rotate">Gerar novo convite da festa</button>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
