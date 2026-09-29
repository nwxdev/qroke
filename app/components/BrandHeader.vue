<script setup lang="ts">
const { connected } = useParty()
</script>
<template>
  <header class="brand-header">
    <NuxtLink to="/busca" class="brand" aria-label="QRokê, início"
      ><BrandLogo decorative
    /></NuxtLink>
    <div class="header-links">
      <span class="connection" :class="{ offline: !connected }"
        ><i />{{ connected ? 'A festa está online' : 'Reconectando…' }}</span
      ><slot /><ThemeToggle />
    </div>
  </header>
</template>
