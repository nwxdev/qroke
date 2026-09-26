<script setup lang="ts">
const { failure, connected } = useParty()
</script>
<template>
  <div v-if="failure" class="notice error" role="alert">
    {{ failure }}<button aria-label="Fechar aviso" @click="failure = ''">×</button>
  </div>
  <div v-if="!connected" class="notice" role="status">
    Reconectando à festa… A fila volta assim que a rede estiver disponível.
  </div>
</template>
