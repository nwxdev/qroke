<script setup lang="ts">
const route = useRoute()
const { failure, connected, state } = useParty()
</script>
<template>
  <PlaybackNotice />
  <div v-if="failure" class="notice error" role="alert">
    {{ failure }}<button aria-label="Fechar aviso" @click="failure = ''">×</button>
  </div>
  <div v-if="connected && state && !state.playerId" class="notice" role="status">
    Aguardando o anfitrião ativar o som. Os pedidos ficam guardados na fila.
    <NuxtLink v-if="route.path !== '/player'" to="/host">Configurar onde tocar →</NuxtLink>
  </div>
  <div
    v-else-if="connected && state?.playerId && !state.devices.some((d) => d.id === state?.playerId)"
    class="notice"
    role="status"
  >
    O aparelho de som está desconectado. Abra a aba do PLAYER ou escolha outro nos
    <NuxtLink v-if="route.path !== '/player'" to="/host">controles do anfitrião</NuxtLink>
    <span v-else>controles do anfitrião</span>.
  </div>
  <div v-if="!connected" class="notice" role="status">
    Reconectando à festa… A fila volta assim que a rede estiver disponível.
  </div>
</template>
