<script setup lang="ts">
const emit = defineEmits<{ activate: [] }>()
const { armed, active, connected, device, soundStatus, soundLabel, soundHint } = usePlayerSound()
const statusId = useId()
</script>
<template>
  <div class="sound-control">
    <button
      class="screen-sound-button"
      :class="{ 'is-armed': armed && connected, 'is-active': active }"
      :aria-label="armed ? soundLabel + '. Reativar som nesta tela' : 'Ativar som nesta tela'"
      :title="soundStatus"
      :disabled="!device"
      :aria-describedby="statusId"
      @click.stop="emit('activate')"
    >
      <AppIcon :name="armed && connected ? 'check' : 'volume'" />
      <span class="sound-button-copy"
        ><strong>{{ soundLabel }}</strong
        ><small>{{ soundHint }}</small></span
      >
    </button>
    <small :id="statusId" class="sr-only sound-status" role="status">{{ soundStatus }}</small>
  </div>
</template>
<style scoped>
.sound-control {
  width: 100%;
  min-width: 0;
}
.screen-sound-button {
  min-height: 44px;
  width: 100%;
  justify-content: center;
  gap: 9px;
  padding: 6px 12px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  border-radius: 12px;
  white-space: nowrap;
}
.screen-sound-button.is-armed {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  color: var(--text);
}
.screen-sound-button.is-active {
  color: var(--accent);
}
.screen-sound-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 15%, var(--surface));
  color: var(--text);
}
.screen-sound-button:focus {
  transform: none;
}
.sound-button-copy {
  display: grid;
  gap: 2px;
  text-align: left;
  line-height: 1.2;
}
.sound-button-copy strong {
  font-size: 13px;
}
.sound-button-copy small {
  color: inherit;
  font-size: 10px;
}
</style>
