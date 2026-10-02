<script setup lang="ts">
import type AppIcon from './AppIcon.vue'
withDefaults(
  defineProps<{
    icon?: InstanceType<typeof AppIcon>['$props']['name']
    variant?: 'primary' | 'secondary'
    type?: 'button' | 'submit'
    disabled?: boolean
    busy?: boolean
  }>(),
  { variant: 'primary', type: 'button' },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const pulse = ref(0)
const active = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
function activate(event: MouseEvent) {
  pulse.value++
  active.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    active.value = false
  }, 650)
  emit('click', event)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <button
    class="action-button"
    :class="['action-button--' + variant, { 'action-button--busy': busy }]"
    :type="type"
    :disabled="disabled || busy"
    :aria-busy="busy || undefined"
    @click="activate"
  >
    <span v-if="active" :key="pulse" class="action-flash" aria-hidden="true" />
    <span class="action-content">
      <span v-if="icon" class="action-icon" :class="{ 'action-icon--active': active }">
        <AppIcon :name="busy ? 'refresh' : icon" />
      </span>
      <span><slot /></span>
      <AppIcon v-if="variant === 'primary'" class="action-arrow" name="arrow-right" />
    </span>
  </button>
</template>
<style scoped>
.action-button {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  min-height: 58px;
  padding: 16px 20px;
  border-radius: 16px;
  font-weight: 800;
  line-height: 1.3;
  text-align: left;
}
.action-button--primary {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
  box-shadow: 0 5px 0 color-mix(in srgb, var(--accent) 45%, var(--bg));
}
.action-button--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 92%, var(--text));
  border-color: var(--accent);
}
.action-button--secondary {
  background: var(--surface);
  color: var(--text);
  border-color: var(--line);
}
.action-button--secondary:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--surface-2);
}
.action-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}
.action-icon {
  display: inline-flex;
  flex-shrink: 0;
}
.action-icon .app-icon {
  width: 23px;
  height: 23px;
}
.action-arrow {
  margin-left: auto;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.action-button:active:not(:disabled) .action-content {
  translate: 0 2px;
}
.action-icon--active {
  animation: action-hop 420ms var(--motion-ease);
}
.action-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 30% 50%, var(--motion-shine), transparent 70%);
  opacity: 0;
  animation: action-flash 600ms var(--motion-ease) both;
}
.action-button--busy .action-icon {
  animation: none;
}
@keyframes action-hop {
  35% {
    transform: translateY(-4px) rotate(-12deg);
  }
  70% {
    transform: translateY(1px) rotate(5deg);
  }
}
@keyframes action-flash {
  from {
    opacity: 0.22;
    transform: scale(0.5);
  }
  to {
    opacity: 0;
    transform: scale(1.6);
  }
}
:global([data-motion='off']) .action-content {
  translate: none !important;
}
@media (prefers-reduced-motion: reduce) {
  .action-content {
    translate: none !important;
  }
}
</style>
