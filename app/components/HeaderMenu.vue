<script setup lang="ts">
const { connected } = useParty()
const route = useRoute()
const id = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)
let previousOverflow = ''
const links = [
  {
    to: '/busca',
    icon: 'search' as const,
    label: 'Buscar músicas',
    hint: 'Encontre a próxima música ou playlist.',
  },
  {
    to: '/player',
    icon: 'tv' as const,
    label: 'Player',
    hint: 'Música, vídeo, karaokê e convite QR.',
  },
  { to: '/host', icon: 'person' as const, label: 'Anfitrião', hint: 'Cuide da festa com seu PIN.' },
]
function open() {
  if (!dialog.value || isOpen.value) return
  previousOverflow = document.documentElement.style.overflow
  dialog.value.showModal()
  document.documentElement.style.overflow = 'hidden'
  isOpen.value = true
}
function close(restoreFocus = true) {
  if (!isOpen.value) return
  isOpen.value = false
  dialog.value?.close()
  document.documentElement.style.overflow = previousOverflow
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}
function select(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('a[href],button:not([disabled])'))
    close()
}
function key(event: KeyboardEvent) {
  if (['Escape', 'Backspace'].includes(event.key) || [10009, 461].includes(event.keyCode)) {
    event.preventDefault()
    close()
    return
  }
  const items = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]') || [],
  ).filter((el) => el.getClientRects().length > 0)
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    const step = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1
    items[(index + step + items.length) % items.length]?.focus()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    const next =
      index < 0
        ? event.shiftKey
          ? items.length - 1
          : 0
        : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length
    items[next]?.focus()
  }
}
watch(
  () => route.fullPath,
  () => close(),
)
onBeforeUnmount(() => close(false))
</script>
<template>
  <div class="header-menu">
    <ThemeToggle />
    <button
      ref="trigger"
      type="button"
      class="icon-button menu-toggle"
      aria-label="Abrir menu"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="id"
      @click="open"
    >
      <AppIcon name="menu" />
    </button>
    <Teleport to="body">
      <dialog
        :id="id"
        ref="dialog"
        class="fullscreen-menu"
        :class="{ 'has-persistent': !!$slots.persistent }"
        aria-label="Menu da festa"
        @cancel.prevent="close()"
        @close="!dialog?.open && close()"
        @keydown="key"
      >
        <div class="menu-top">
          <BrandLogo class="menu-brand" />
          <div class="menu-top-controls">
            <ThemeToggle />
            <button
              type="button"
              class="icon-button menu-close"
              aria-label="Fechar menu"
              autofocus
              @click="close()"
            >
              <AppIcon name="close" />
            </button>
          </div>
        </div>
        <div class="menu-body">
          <div class="menu-content">
            <span class="eyebrow">SUA FESTA, SEU RITMO</span>
            <h2>Para onde vamos?</h2>
            <nav aria-label="Páginas da festa" @click="select">
              <NuxtLink
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                class="menu-link"
                :aria-label="link.label"
                :aria-current="route.path === link.to ? 'page' : undefined"
              >
                <AppIcon :name="link.icon" />
                <span
                  ><strong>{{ link.label }}</strong
                  ><small>{{ link.hint }}</small></span
                >
                <AppIcon name="arrow-right" class="menu-arrow" />
              </NuxtLink>
            </nav>
            <section
              v-if="$slots.default"
              class="menu-actions"
              aria-label="Ações desta tela"
              @click="select"
            >
              <span class="eyebrow">NESTA TELA</span>
              <slot />
            </section>
          </div>
          <p class="menu-connection" :class="{ offline: !connected }" role="status">
            <i aria-hidden="true" />{{ connected ? 'A festa está online' : 'Reconectando…' }}
          </p>
        </div>
      </dialog>
    </Teleport>
    <Teleport :to="dialog || 'body'" :disabled="!isOpen">
      <div v-if="$slots.persistent" class="header-persistent"><slot name="persistent" /></div>
    </Teleport>
  </div>
</template>
<style scoped>
.header-menu,
.menu-top-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.menu-toggle,
.menu-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
}
.menu-toggle:focus {
  transform: none;
}
.fullscreen-menu {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}
.fullscreen-menu[open] {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}
.header-persistent {
  position: fixed;
  inset: auto 0 0;
  z-index: 60;
  display: flex;
  align-items: center;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 8px max(16px, env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  border-top: 1px solid var(--line);
  background: var(--bg);
}
.fullscreen-menu.has-persistent {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.fullscreen-menu::backdrop {
  background: var(--bg);
}
.menu-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: max(12px, env(safe-area-inset-top)) max(5vw, env(safe-area-inset-right)) 12px
    max(5vw, env(safe-area-inset-left));
  border-bottom: 1px solid var(--line);
}
.menu-brand {
  --brand-logo-width: 180px;
}
.menu-body {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(24px, 6vh, 64px) max(5vw, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom)) max(5vw, env(safe-area-inset-left));
}
.menu-content {
  width: min(100%, 680px);
  margin: auto;
}
.menu-content h2 {
  font-size: clamp(28px, 5vw, 44px);
  letter-spacing: -0.04em;
  margin: 8px 0 28px;
}
.menu-content nav {
  display: grid;
  gap: 12px;
}
.menu-link {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 84px;
  padding: 16px 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  transition:
    background 180ms,
    border-color 180ms,
    transform 180ms;
}
.menu-link:hover,
.menu-link[aria-current='page'] {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.menu-link:hover {
  transform: translateX(3px);
}
.menu-link > .app-icon {
  color: var(--accent);
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}
.menu-link > span {
  min-width: 0;
}
.menu-link strong,
.menu-link small {
  display: block;
}
.menu-link strong {
  font-family: Manrope, sans-serif;
  font-size: clamp(18px, 3vw, 22px);
}
.menu-link small {
  margin-top: 3px;
  line-height: 1.5;
}
.menu-link .menu-arrow {
  margin-left: auto;
  width: 20px;
}
.menu-actions {
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  margin-top: 24px;
}
.menu-actions :deep(button) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 12px;
}
.menu-connection {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 32px;
  font-size: 12px;
}
.menu-connection i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
}
.menu-connection.offline i {
  background: var(--coral);
}
.fullscreen-menu[open] .menu-content {
  animation: menu-arrive 220ms ease-out;
}
@keyframes menu-arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 380px) {
  .menu-brand {
    --brand-logo-width: 146px;
  }
  .menu-link {
    gap: 12px;
    padding: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fullscreen-menu[open] .menu-content {
    animation: none;
  }
  .menu-link {
    transition: none;
  }
  .menu-link:hover {
    transform: none;
  }
}
</style>
