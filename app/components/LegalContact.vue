<script setup lang="ts">
import { LEGAL_OPERATOR } from '#shared/legal'
</script>
<template>
  <p class="legal-contact">
    QRokê é mantido por <strong>{{ LEGAL_OPERATOR.name }}</strong
    >, CNPJ {{ LEGAL_OPERATOR.cnpj }}. Para contato, privacidade e pedidos sobre seus dados:
    <a :href="'mailto:' + LEGAL_OPERATOR.email">{{ LEGAL_OPERATOR.email }}</a
    >.
  </p>
</template>
<style scoped>
.legal-contact {
  overflow-wrap: anywhere;
}
a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
