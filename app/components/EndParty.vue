<script setup lang="ts">
const { admin, state } = useParty()
const { id, href } = usePartyRoute()
const request = usePartyFetch()
const dialog = ref<HTMLDialogElement | null>(null),
  busy = ref(false),
  failure = ref('')
async function closeParty() {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  try {
    await request('/api/party/close', { method: 'POST', body: {} })
    location.assign(href('/encerrada'))
  } catch (error) {
    failure.value = errorText(error)
    busy.value = false
  }
}
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <section v-if="id && admin" class="end-party">
    <button @click="dialog?.showModal()">Encerrar festa</button>
    <Teleport to="body"
      ><dialog ref="dialog" class="end-party-dialog" aria-labelledby="end-party-title">
        <h2 id="end-party-title">Encerrar {{ state?.party?.name || 'esta festa' }}?</h2>
        <p>
          A música será interrompida e todos perderão o acesso. Esta festa não poderá ser reaberta.
        </p>
        <p v-if="failure" role="alert">{{ failure }}</p>
        <div>
          <button :disabled="busy" @click="dialog?.close()">Continuar festa</button
          ><button :disabled="busy" @click="closeParty">
            {{ busy ? 'Encerrando…' : 'Sim, encerrar festa' }}
          </button>
        </div>
      </dialog></Teleport
    >
  </section>
</template>
<style scoped>
.end-party {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.end-party-dialog {
  width: min(480px, calc(100% - 32px));
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 28px;
  background: var(--surface);
  color: var(--text);
}
.end-party-dialog::backdrop {
  background: #000b;
}
.end-party-dialog p {
  margin-top: 16px;
}
.end-party-dialog div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
</style>
