<script setup lang="ts">
import type { PartyMotionFeedback } from '../composables/usePartyMotion'
const { feedback } = usePartyMotion()
const { page } = usePartyRoute()
const { isPlayer } = useParty()
const menuOpen = useState('qroke:menu-open', () => false)
const joinOpen = useState('qroke:join-open', () => false)
const notice = ref<PartyMotionFeedback | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
const visible = computed(
  () =>
    notice.value &&
    !menuOpen.value &&
    !joinOpen.value &&
    !isPlayer.value &&
    !['/player', '/tv', '/qr'].includes(page.value),
)
const icon = computed(() => {
  switch (notice.value?.kind) {
    case 'like':
      return 'like'
    case 'dislike':
      return 'dislike'
    case 'undo':
      return 'refresh'
    case 'remove':
      return 'close'
    case 'playlist':
      return 'playlist'
    default:
      return 'check'
  }
})
function dismiss() {
  clearTimeout(timer)
  notice.value = null
}
watch(feedback, (value) => {
  dismiss()
  if (!value || Date.now() - value.at > 3000) return
  notice.value = value
  timer = setTimeout(dismiss, 3200)
})
onBeforeUnmount(dismiss)
</script>
<template>
  <Teleport to="body">
    <div class="motion-feedback-region" role="status" aria-live="polite" aria-atomic="true">
      <Transition name="motion-toast">
        <div
          v-if="visible && notice"
          :key="notice.id"
          class="motion-feedback"
          :data-kind="notice.kind"
        >
          <span class="motion-feedback-icon"><AppIcon :name="icon" /></span>
          <span>{{ notice.message }}</span>
          <button type="button" aria-label="Fechar confirmação" @click="dismiss">
            <AppIcon name="close" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
<style scoped>
.motion-feedback-region {
  position: fixed;
  z-index: 90;
  inset: auto max(16px, env(safe-area-inset-right))
    calc(20px + var(--qroke-dock-space, 0px) + env(safe-area-inset-bottom)) auto;
  max-width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}
.motion-feedback {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--motion-color);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 8px 32px var(--motion-glow);
  pointer-events: auto;
  overflow-wrap: anywhere;
  font-weight: 600;
  font-size: 14px;
}
.motion-feedback > span:nth-child(2) {
  min-width: 0;
}
.motion-feedback[data-kind='dislike'],
.motion-feedback[data-kind='remove'] {
  --motion-color: var(--coral);
}
.motion-feedback-icon {
  display: grid;
  place-items: center;
  color: var(--motion-color);
  flex-shrink: 0;
}
.motion-feedback-icon .app-icon {
  width: 24px;
  height: 24px;
}
.motion-feedback button {
  background: transparent;
  border: 0;
  flex-shrink: 0;
  padding: 8px;
}
.motion-toast-enter-active {
  transition:
    opacity var(--motion-fast),
    transform var(--motion-enter) var(--motion-spring);
}
.motion-toast-leave-active {
  transition:
    opacity var(--motion-fast),
    transform var(--motion-fast);
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
  pointer-events: none;
}
.motion-toast-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}
.motion-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
