<script setup lang="ts">
const theme = useState<import('#shared/themes').PartyTheme>(
  'qroke:active-party-theme',
  () => 'classic',
)
const cinema = useState('qroke:karaoke-cinema', () => false)
const { enabled, reduced } = useMotionPreference()
const surface = ref<HTMLElement | null>(null)
const visible = ref(true)
const pulse = ref(0),
  point = ref({ x: 0, y: 0 })
const active = computed(
  () =>
    theme.value === 'sonic-day' &&
    enabled.value &&
    !reduced.value &&
    !cinema.value &&
    visible.value,
)
let frame = 0,
  mounted = false
function move(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    surface.value?.style.setProperty('--pointer-x', (event.clientX / innerWidth - 0.5) * 14 + 'px')
    surface.value?.style.setProperty('--pointer-y', (event.clientY / innerHeight - 0.5) * 14 + 'px')
  })
}
function press(event: PointerEvent) {
  if (!(event.target as Element).closest('button, a, .q-toggle, .theme-option')) return
  point.value = { x: event.clientX, y: event.clientY }
  pulse.value++
}
function visibility() {
  visible.value = !document.hidden
}
function detach() {
  document.removeEventListener('pointermove', move)
  document.removeEventListener('pointerdown', press)
  cancelAnimationFrame(frame)
  frame = 0
}
function connect() {
  detach()
  if (active.value && mounted) {
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerdown', press, { passive: true })
  }
}
watch(active, connect)
onMounted(() => {
  mounted = true
  visibility()
  connect()
  document.addEventListener('visibilitychange', visibility)
})
onBeforeUnmount(() => {
  detach()
  document.removeEventListener('visibilitychange', visibility)
})
</script>
<template>
  <div v-if="active" ref="surface" class="party-atmosphere" aria-hidden="true">
    <i v-for="n in 4" :key="'ring' + n" class="party-orbit" :style="{ '--i': n }" />
    <i v-for="n in 6" :key="'speed' + n" class="party-speed-line" :style="{ '--i': n }" />
  </div>
  <ClientOnly
    ><Teleport to="body">
      <i
        v-if="pulse && active"
        :key="pulse"
        class="party-touch-ring"
        :style="{ left: point.x + 'px', top: point.y + 'px' }" /></Teleport
  ></ClientOnly>
</template>
