<script setup lang="ts">
import { partyTheme, type PartyTheme } from '#shared/themes'
const { state, owner, pending, control } = useParty()
const selected = ref<PartyTheme>(partyTheme(state.value?.theme))
const saved = ref(false)
watch(
  () => state.value?.theme,
  (value) => {
    selected.value = partyTheme(value)
  },
)
watch(selected, () => {
  saved.value = false
})
async function save() {
  await control({ action: 'theme', theme: selected.value })
  saved.value = partyTheme(state.value?.theme) === selected.value
}
</script>
<template>
  <section class="party-appearance" aria-label="Aparência da festa">
    <h3><AppIcon name="sparkles" /> Aparência da festa</h3>
    <p>
      O visual acompanha todos os participantes. Claro ou escuro continua sendo uma preferência de
      cada aparelho.
    </p>
    <PartyThemePicker v-model="selected" :disabled="!owner || pending" />
    <ActionButton
      v-if="owner"
      :disabled="pending || selected === partyTheme(state?.theme)"
      icon="check"
      @click="save"
      >Aplicar tema à festa</ActionButton
    >
    <p v-else class="hint">Somente o dono da festa pode alterar o tema.</p>
    <p v-if="saved" role="status">Tema aplicado à festa.</p>
  </section>
</template>
