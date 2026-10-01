<script setup lang="ts">
withDefaults(defineProps<{ as?: string; delay?: number; glow?: boolean; immediate?: boolean }>(), {
  as: 'div',
  delay: 0,
  glow: false,
})
</script>
<template>
  <component
    :is="as"
    class="motion-reveal"
    :class="{ 'motion-reveal-glow': glow, 'motion-reveal-immediate': immediate }"
    :style="{ '--motion-delay': Math.max(0, Math.min(delay, 240)) + 'ms' }"
    ><slot
  /></component>
</template>
<style scoped>
.motion-reveal {
  animation: motion-arrive var(--motion-enter) var(--motion-ease) backwards;
  animation-delay: var(--motion-delay, 0ms);
}
.motion-reveal-immediate {
  animation-name: motion-arrive-visible;
}
.motion-reveal-glow {
  position: relative;
}
.motion-reveal-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    0 0 0 1px var(--motion-color),
    0 0 28px var(--motion-glow);
  animation: motion-welcome-glow var(--motion-show) var(--motion-ease) var(--motion-delay, 0ms);
}
@keyframes motion-arrive-visible {
  from {
    transform: translateY(var(--motion-distance)) scale(0.985);
  }
  to {
    transform: none;
  }
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
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
