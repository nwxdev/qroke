<script setup lang="ts">
const { guest, rename, pending, failure } = useParty()
const editing = ref(false),
  name = ref('')
const field = ref<HTMLInputElement | null>(null)
async function edit() {
  name.value = guest.value?.name || ''
  editing.value = true
  await nextTick()
  field.value?.focus()
}
async function save() {
  await rename(name.value)
  if (!failure.value) editing.value = false
}
</script>
<template>
  <section v-if="guest" class="guest-identity panel" aria-label="Sua identidade na festa">
    <div class="identity-label">
      <AppIcon name="person" />
      <div>
        <small>VOCÊ NA FESTA</small><strong>{{ guest.name }}</strong>
      </div>
    </div>
    <button v-if="!editing" @click="edit"><AppIcon name="edit" /> Editar nome</button>
    <form v-else @submit.prevent="save">
      <label class="sr-only" for="guest-edit-name">Novo nome</label>
      <input
        id="guest-edit-name"
        ref="field"
        v-model="name"
        autocomplete="nickname"
        maxlength="40"
        required
        :disabled="pending"
      />
      <button type="submit" :disabled="pending || name.trim().length < 2">Salvar nome</button>
      <button type="button" :disabled="pending" @click="editing = false">Cancelar</button>
    </form>
  </section>
</template>
<style scoped>
.guest-identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 20px;
  padding: 16px 20px;
  border-color: var(--accent);
}
.identity-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.identity-label strong,
.identity-label small {
  display: block;
  overflow-wrap: anywhere;
}
.identity-label strong {
  font-size: 20px;
}
.guest-identity button,
.guest-identity form {
  display: flex;
  align-items: center;
  gap: 8px;
}
.guest-identity form {
  flex-wrap: wrap;
  min-width: 0;
}
.guest-identity input {
  min-width: 0;
  width: min(220px, 100%);
}
</style>
