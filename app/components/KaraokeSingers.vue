<script setup lang="ts">
import type { Guest } from '../../shared/types'
defineProps<{ people?: Guest[]; fallback?: string }>()
</script>
<template>
  <p class="karaoke-singers">
    <AppIcon name="person" /><span
      ><strong>Quem canta:</strong>
      {{
        people?.length
          ? people.map((person) => person.name).join(' · ')
          : fallback || 'Participantes da festa'
      }}</span
    >
  </p>
</template>
<style scoped>
.karaoke-singers {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.karaoke-singers span {
  min-width: 0;
}
</style>
