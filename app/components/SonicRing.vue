<script setup lang="ts">
import { createSonicRing } from '~/utils/sonic-ring'
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
let renderer: ReturnType<typeof createSonicRing> = null
function spin() {
  renderer?.spin()
}
function reset() {
  renderer?.reset()
}
function tilt(event: PointerEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  renderer?.tilt(
    (event.clientX - box.x) / box.width - 0.5,
    (event.clientY - box.y) / box.height - 0.5,
  )
}
onMounted(() => {
  if (canvas.value)
    renderer = createSonicRing(canvas.value, () => {
      ready.value = false
    })
  ready.value = !!renderer
})
onBeforeUnmount(() => renderer?.dispose())
</script>
<template>
  <button
    class="sonic-ring-hit"
    type="button"
    aria-label="Girar argola do Sonic"
    title="Toque para girar a argola"
    @pointermove="tilt"
    @pointerleave="reset"
    @click="spin"
  >
    <span class="sonic-ring-art" aria-hidden="true"
      ><canvas
        ref="canvas"
        class="sonic-ring-canvas"
        :class="{ ready }"
        width="128"
        height="128" /><i v-if="!ready" class="sonic-ring-fallback"
    /></span>
    <span class="sonic-ring-hint">Entre no ritmo <span aria-hidden="true">↗</span></span>
  </button>
</template>
<style scoped>
.sonic-ring-hit {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 48px;
  padding: 0 10px 0 0;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 12px !important;
  touch-action: pan-y;
  color: var(--text);
  text-align: left;
}
.sonic-ring-art {
  position: relative;
  display: block;
  width: 58px;
  height: 58px;
  flex-shrink: 0;
  pointer-events: none;
}
.sonic-ring-canvas {
  width: 100%;
  height: 100%;
  opacity: 0;
}
.sonic-ring-canvas.ready {
  opacity: 1;
}
.sonic-ring-fallback {
  position: absolute;
  inset: 10px;
  border: 7px solid #ffca4e;
  border-top-color: #fff2a0;
  border-bottom-color: #b77604;
  border-radius: 50%;
  box-shadow: 2px 2px 0 #926200;
  transform: rotate(-20deg);
}
.sonic-ring-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
}
.sonic-ring-hint > span {
  color: var(--accent);
  margin-left: 3px;
}
.sonic-ring-hit:hover .sonic-ring-hint {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.sonic-ring-hit:focus-visible {
  outline: 3px solid var(--highlight);
  outline-offset: 3px;
}
</style>
