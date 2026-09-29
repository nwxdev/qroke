<script setup lang="ts">
import type { PlaylistLabel } from '../../shared/types'
defineProps<{ playlist?: PlaylistLabel }>()
</script>
<template>
  <span v-if="playlist" class="playlist-badge"
    ><AppIcon name="playlist" /><span>Playlist · {{ playlist.title }}</span></span
  >
</template>
<style scoped>
.playlist-badge {
  display: inline-flex;
  align-items: flex-start;
  gap: 5px;
  padding: 5px 7px;
  max-width: 100%;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.playlist-badge .app-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
</style>
