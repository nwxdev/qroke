<script setup lang="ts">
const { state, guest } = useParty()
</script>
<template>
  <section class="party-people panel" aria-label="Participantes presentes">
    <div class="section-heading">
      <h2>Quem está na festa</h2>
      <span class="count-badge">{{ state?.guests?.length || 0 }}</span>
    </div>
    <ul v-if="state?.guests?.length">
      <li v-for="person in state.guests" :key="person.id">
        <span class="live-dot" /><strong>{{ person.name }}</strong
        ><small v-if="guest?.id === person.id">você</small>
      </li>
    </ul>
    <p v-else class="hint">Os participantes aparecem aqui ao entrar pelo nome.</p>
    <small>Presentes nos últimos 90 segundos. Cada navegador representa uma entrada.</small>
  </section>
</template>
<style scoped>
.party-people {
  margin-top: 20px;
  min-width: 0;
}
.party-people ul {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  max-height: 200px;
  overflow: auto;
}
.party-people li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: 10px;
  max-width: 100%;
}
.party-people strong {
  overflow-wrap: anywhere;
}
.party-people > small {
  display: block;
  font-size: 11px;
}
</style>
