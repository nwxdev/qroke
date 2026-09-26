<script setup lang="ts">
const { failure, connected, state } = useParty()
</script>
<template>
  <div v-if="failure" class="notice error" role="alert">
    {{ failure }}<button aria-label="Fechar aviso" @click="failure = ''">×</button>
  </div>
  <div v-if="connected && state && !state.playerId" class="notice" role="status">
    Aguardando o anfitrião ativar o som. Os pedidos ficam guardados na fila.
    <NuxtLink to="/host">Configurar onde tocar →</NuxtLink>
  </div>
  <div
    v-else-if="connected && state?.playerId && !state.devices.some((d) => d.id === state?.playerId)"
    class="notice"
    role="status"
  >
    O aparelho de som está desconectado. Abra a aba do PLAYER ou escolha outro nos
    <NuxtLink to="/host">controles do anfitrião</NuxtLink>.
  </div>
  <div v-if="!connected" class="notice" role="status">
    Reconectando à festa… A fila volta assim que a rede estiver disponível.
  </div>
</template>
