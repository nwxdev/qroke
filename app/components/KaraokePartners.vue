<script setup lang="ts">
const model = defineModel<string[]>({ default: () => [] })
defineProps<{ disabled?: boolean }>()
const { state, guest } = useParty()
const others = computed(
  () => state.value?.guests.filter((person) => person.id !== guest.value?.id) || [],
)
</script>
<template>
  <fieldset class="karaoke-partners" :disabled="disabled">
    <legend>Quem vai cantar?</legend>
    <p v-if="guest">{{ guest.name }} já está incluído(a). Convide mais pessoas:</p>
    <p v-else>Escolha os participantes que vão cantar:</p>
    <div class="partner-options">
      <label v-for="person in others" :key="person.id"
        ><input v-model="model" type="checkbox" :value="person.id" />{{ person.name }}</label
      >
    </div>
    <small v-if="!others.length">Os parceiros aparecem aqui quando entrarem na festa.</small>
  </fieldset>
</template>
<style scoped>
.karaoke-partners {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  margin: 16px 0;
  min-width: 0;
}
.karaoke-partners p {
  font-size: 12px;
}
.partner-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 200px;
  overflow: auto;
}
.partner-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  min-height: 44px;
  overflow-wrap: anywhere;
}
.partner-options input {
  width: 20px;
  min-height: 20px;
  accent-color: var(--accent);
}
</style>
