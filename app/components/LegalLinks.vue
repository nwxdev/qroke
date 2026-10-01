<script setup lang="ts">
import { LEGAL_LINKS } from '#shared/legal'
defineProps<{ newTab?: boolean }>()
</script>
<template>
  <nav class="legal-links" aria-label="Informações legais">
    <NuxtLink
      v-for="link in LEGAL_LINKS"
      :key="link.path"
      :to="link.path"
      :target="newTab ? '_blank' : undefined"
      :rel="newTab ? 'noopener noreferrer' : undefined"
      >{{ link.label }}</NuxtLink
    >
  </nav>
</template>
<style scoped>
.legal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-top: 18px;
}
a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
