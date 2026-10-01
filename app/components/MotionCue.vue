<script setup lang="ts">
import type { PartyMotionKind } from '../composables/usePartyMotion'
const props = withDefaults(defineProps<{ trigger: number; kind?: PartyMotionKind }>(), {
  kind: 'success',
})
const cue = ref<HTMLElement | null>(null)
const active = ref(false)
const sequence = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.trigger,
  (value) => {
    if (!value) return
    clearTimeout(timer)
    sequence.value++
    active.value = true
    const token = cue.value
      ? getComputedStyle(cue.value).getPropertyValue('--motion-celebrate').trim()
      : '620ms'
    const parsed = Number.parseFloat(token) * (token.endsWith('ms') ? 1 : 1000)
    const duration = Number.isFinite(parsed) ? Math.min(3000, Math.max(0, parsed)) : 620
    timer = setTimeout(() => {
      active.value = false
    }, duration + 80)
  },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <span ref="cue" class="motion-cue" :data-kind="kind">
    <span :key="sequence" class="motion-cue-content" :class="{ 'motion-cue-active': active }"
      ><slot
    /></span>
    <span v-if="active" :key="'burst-' + sequence" class="motion-burst" aria-hidden="true">
      <i v-for="n in 7" :key="n" :style="{ '--particle': n }">{{ n % 3 === 0 ? '♪' : '✦' }}</i>
    </span>
  </span>
</template>
<style scoped>
.motion-cue,
.motion-cue-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.motion-cue {
  position: relative;
}
.motion-cue-content {
  gap: inherit;
}
.motion-cue[data-kind='dislike'],
.motion-cue[data-kind='remove'] {
  --motion-color: var(--coral);
  --motion-glow: color-mix(in srgb, var(--coral) 24%, transparent);
}
.motion-cue-active {
  animation: motion-bounce var(--motion-celebrate) var(--motion-spring);
}
[data-kind='like'] .motion-cue-active {
  animation-name: motion-like;
}
[data-kind='dislike'] .motion-cue-active {
  animation-name: motion-dislike;
}
[data-kind='undo'] .motion-cue-active,
[data-kind='remove'] .motion-cue-active {
  animation-name: motion-undo;
}
.motion-burst {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
  z-index: 2;
}
.motion-burst i {
  position: absolute;
  font-size: 13px;
  line-height: 1;
  font-style: normal;
  color: var(--motion-color);
  opacity: 0;
  --angle: calc(var(--particle) * 51deg);
  animation: motion-spark var(--motion-celebrate) var(--motion-ease) both;
}
.motion-burst i:nth-child(even) {
  color: var(--coral);
}
[data-kind='undo'] .motion-burst,
[data-kind='remove'] .motion-burst {
  display: none;
}
@keyframes motion-bounce {
  35% {
    transform: translateY(-4px) scale(1.2) rotate(-8deg);
  }
  65% {
    transform: translateY(1px) scale(0.94) rotate(5deg);
  }
}
@keyframes motion-like {
  35% {
    transform: translateY(-6px) scale(1.22) rotate(-14deg);
  }
  70% {
    transform: translateY(1px) rotate(4deg);
  }
}
@keyframes motion-dislike {
  35% {
    transform: translateY(5px) scale(1.12) rotate(12deg);
  }
  70% {
    transform: translateY(-2px) rotate(-4deg);
  }
}
@keyframes motion-undo {
  40% {
    transform: scale(0.76) rotate(-12deg);
    opacity: 0.6;
  }
}
@keyframes motion-spark {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(5px) rotate(calc(-1 * var(--angle))) scale(0.3);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(32px) rotate(calc(-1 * var(--angle))) scale(0.6);
  }
}
@media (prefers-reduced-motion: reduce) {
  .motion-burst {
    display: none;
  }
}
</style>
