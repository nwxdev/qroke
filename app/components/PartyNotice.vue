<script setup lang="ts">
const partyRoute = usePartyRoute()
const route = useRoute()
const { connected, state } = useParty()
</script>
<template>
  <div v-if="connected && state && !state.playerId" class="notice" role="status">
    Aguardando o anfitrião ativar o som. Os pedidos ficam guardados na fila.
    <PartyLink v-if="partyRoute.page.value !== '/player'" to="/host"
      >Configurar onde tocar →</PartyLink
    >
  </div>
  <div
    v-else-if="connected && state?.playerId && !state.devices.some((d) => d.id === state?.playerId)"
    class="notice"
    role="status"
  >
    O aparelho de som está desconectado. Abra a aba do PLAYER ou escolha outro nos
    <PartyLink v-if="partyRoute.page.value !== '/player'" to="/host"
      >controles do anfitrião</PartyLink
    >
    <span v-else>controles do anfitrião</span>.
  </div>
</template>
