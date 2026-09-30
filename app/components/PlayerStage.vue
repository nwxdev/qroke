<script setup lang="ts">
const { isPlayer } = useParty()
</script>
<template>
  <div v-if="isPlayer" class="player-stage" data-player-stage aria-label="Área do player" />
</template>
<style scoped>
.player-stage {
  width: 100%;
  min-width: 200px;
  min-height: 264px;
  aspect-ratio: 16 / 10;
}
</style>
