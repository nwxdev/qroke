<script setup lang="ts">
const { isPlayer } = useParty()
</script>
<template>
  <div class="page-shell qr-page">
    <BrandHeader><NuxtLink to="/tv" class="subtle-link">TV ↗</NuxtLink></BrandHeader>
    <main>
      <span class="eyebrow">TODO MUNDO É DJ</span>
      <h1>Aponte a câmera.<br /><em>Entre na festa.</em></h1>
      <QrCode large />
      <p>Conecte-se ao mesmo Wi-Fi e escolha sua música.</p>
      <MediaPlayer v-if="isPlayer" />
    </main>
  </div>
</template>
