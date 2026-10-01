<script setup lang="ts">
const { isPlayer } = useParty()
</script>
<template>
  <div class="page-shell">
    <BrandHeader /><PartyNotice />
    <main class="request-page">
      <MusicSearch />
      <QueueCarousel />
      <GuestIdentity /><PartyPeople />
      <PlayerStage v-if="isPlayer" />
    </main>
    <footer><LegalLinks new-tab /></footer>
  </div>
</template>
<style scoped>
.request-page {
  max-width: 1000px;
  margin: 28px auto;
}
</style>
