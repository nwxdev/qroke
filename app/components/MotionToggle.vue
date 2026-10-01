<script setup lang="ts">
defineProps<{ compact?: boolean }>()
const { enabled, reduced, toggle } = useMotionPreference()
</script>
<template>
  <button
    type="button"
    class="motion-toggle"
    :class="{ compact }"
    :aria-label="enabled ? 'Desativar animações' : 'Ativar animações'"
    :title="
      reduced
        ? 'Movimento reduzido do aparelho respeitado'
        : enabled
          ? 'Desativar animações'
          : 'Ativar animações'
    "
    :aria-pressed="enabled"
    @click="toggle"
  >
    <AppIcon name="sparkles" />
    <span :class="{ 'sr-only': compact }"
      ><strong>Animações {{ enabled ? 'ativadas' : 'desativadas' }}</strong>
      <small v-if="reduced">Movimento reduzido do aparelho respeitado</small></span
    >
  </button>
</template>
<style scoped>
.motion-toggle {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  text-align: left;
  margin-top: 20px;
}
.motion-toggle strong,
.motion-toggle small {
  display: block;
}
.motion-toggle strong {
  font-size: 14px;
}
.motion-toggle.compact {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
  margin: 0;
  background: transparent;
}
</style>
