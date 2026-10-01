<script setup lang="ts">
withDefaults(defineProps<{ as?: string; delay?: number; glow?: boolean }>(), {
  as: 'div',
  delay: 0,
  glow: false,
})
</script>
<template>
  <component
    :is="as"
    class="motion-reveal"
    :class="{ 'motion-reveal-glow': glow }"
    :style="{ '--motion-delay': Math.max(0, Math.min(delay, 240)) + 'ms' }"
    ><slot
  /></component>
</template>
<style scoped>
.motion-reveal {
  animation: motion-arrive var(--motion-enter) var(--motion-ease) backwards;
  animation-delay: var(--motion-delay, 0ms);
}
.motion-reveal-glow {
  animation-name: motion-arrive, motion-welcome-glow;
  animation-duration: var(--motion-enter), var(--motion-show);
}
@keyframes motion-arrive {
  from {
    opacity: 0;
    transform: translateY(var(--motion-distance)) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes motion-welcome-glow {
  30% {
    box-shadow:
      0 0 0 1px var(--motion-color),
      0 0 28px var(--motion-glow);
  }
}
</style>
