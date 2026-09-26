<script setup lang="ts">
const { connected } = useParty()
</script>
<template>
  <header class="brand-header">
    <NuxtLink to="/" class="brand" aria-label="QRokê, início"
      ><span class="brand-mark">q</span> QRokê<span class="brand-dot">●</span></NuxtLink
    >
    <div class="header-links">
      <span class="connection" :class="{ offline: !connected }"
        ><i />{{ connected ? 'A festa está online' : 'Reconectando…' }}</span
      ><slot /><ThemeToggle />
    </div>
  </header>
</template>
