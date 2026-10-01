<script setup lang="ts">
defineProps<{ action: string }>()
</script>
<template>
  <p class="legal-notice">
    Ao {{ action }}, você concorda com os
    <NuxtLink to="/termos-de-uso" target="_blank" rel="noopener noreferrer">Termos de Uso</NuxtLink>
    e a
    <NuxtLink to="/politica-de-privacidade" target="_blank" rel="noopener noreferrer"
      >Política de Privacidade</NuxtLink
    >. A medição de visitas é opcional e tem uma escolha separada.
  </p>
</template>
<style scoped>
.legal-notice {
  margin-block: 12px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--muted);
}
a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
