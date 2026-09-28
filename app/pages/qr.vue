<script setup lang="ts">
const { isPlayer, state, queue } = useParty()
</script>
<template>
  <div class="page-shell qr-page">
    <BrandHeader
      ><NuxtLink to="/host" class="subtle-link">Anfitrião ↗</NuxtLink
      ><NuxtLink to="/tv" class="subtle-link">TV ↗</NuxtLink></BrandHeader
    >
    <main class="qr-layout">
      <section class="qr-invite" aria-labelledby="invite-title">
        <span class="eyebrow">TODO MUNDO É DJ</span>
        <h1 id="invite-title">Aponte a câmera.<br /><em>Entre na festa.</em></h1>
        <QrCode large />
      </section>
      <section class="qr-queue panel" aria-labelledby="qr-queue-title">
        <div class="section-heading">
          <h2 id="qr-queue-title">Fila da festa</h2>
          <span class="count-badge">{{ queue.length }} na fila</span>
        </div>
        <div v-if="state?.current" class="qr-current">
          <span class="eyebrow">{{ state.paused ? 'EM PAUSA' : 'AGORA NA FESTA' }}</span>
          <h3>{{ state.current.title }}</h3>
          <p>{{ state.current.artist }} · {{ state.current.guestName }}</p>
          <PlaylistBadge :playlist="state.current.playlist" />
        </div>
        <div class="qr-queue-scroll" tabindex="0" role="region" aria-label="Músicas na fila">
          <QueueList />
        </div>
        <MediaPlayer v-if="isPlayer" />
      </section>
    </main>
  </div>
</template>
