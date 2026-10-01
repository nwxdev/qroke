<script setup lang="ts">
const partyRoute = usePartyRoute()
const { connected, isPlayer } = useParty()
const route = useRoute()
const id = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const navigation = ref<HTMLElement | null>(null)
const menuContent = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | undefined
const isOpen = ref(false)
const playbackMenuOpen = useState('qroke:menu-open', () => false)
const joinOpen = useState('qroke:join-open', () => false)
async function joinParty() {
  close()
  await nextTick()
  joinOpen.value = true
}
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
  dialog.value.show()
  playbackMenuOpen.value = true
  void nextTick(() => dialog.value?.querySelector<HTMLButtonElement>('.menu-close')?.focus())
  document.documentElement.style.overflow = 'hidden'
  isOpen.value = true
}
function close(restoreFocus = true) {
  if (!isOpen.value) return
  isOpen.value = false
  playbackMenuOpen.value = false
  dialog.value?.close()
  document.documentElement.style.overflow = previousOverflow
  if (restoreFocus)
    void nextTick(() => {
      const target = trigger.value?.getClientRects().length
        ? trigger.value
        : navigation.value?.querySelector<HTMLElement>('[aria-current="page"]')
      target?.focus({ preventScroll: true })
    })
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
onMounted(() => {
  // A largura útil do cabeçalho define o menu, incluindo rotação e zoom.
  const header = trigger.value?.closest('header')
  if (header) {
    resizeObserver = new ResizeObserver(() => {
      if (isOpen.value && !trigger.value?.getClientRects().length) close()
    })
    resizeObserver.observe(header)
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  close(false)
})
</script>
<template>
  <div class="header-menu" :class="{ 'has-actions': !!$slots.default }">
    <Teleport :to="menuContent || 'body'" :disabled="!isOpen">
      <div ref="navigation" class="header-navigation">
        <nav aria-label="Páginas da festa" @click="select">
          <PartyLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="menu-link"
            :aria-label="link.label"
            :aria-current="partyRoute.page.value === link.to ? 'page' : undefined"
          >
            <AppIcon :name="link.icon" />
            <span
              ><strong>{{ link.label }}</strong></span
            >
            <AppIcon name="arrow-right" class="menu-arrow" />
          </PartyLink>
        </nav>
        <button type="button" class="menu-link join-party-menu" @click="joinParty">
          <AppIcon name="qr" /><span><strong>Entrar na festa</strong></span>
        </button>
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
    </Teleport>
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
        :class="{ 'has-persistent': !!$slots.persistent, 'has-player': isPlayer }"
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
          <div ref="menuContent" class="menu-content">
            <h2>Menu</h2>
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
.menu-toggle:focus,
.header-menu > .header-navigation .menu-link:focus {
  transform: none;
}
.fullscreen-menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding-bottom: var(--qroke-dock-space, 0px);
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0 0 var(--qroke-dock-space, 0px);
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
.join-party-menu {
  width: 100%;
  margin-top: 12px;
  text-align: left;
}
.header-menu > .header-navigation .join-party-menu {
  width: auto;
  margin-top: 0;
}
.menu-link {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 64px;
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

/* Uma única navegação muda de lugar sem duplicar ações ou remontar o player. */
.header-menu > .header-navigation {
  display: none;
}
@container party-header (min-width: 50rem) {
  .header-menu:not(.has-actions) > .header-navigation {
    display: flex;
  }
  .header-menu:not(.has-actions) > .menu-toggle {
    display: none;
  }
}
@container party-header (min-width: 63rem) {
  .header-menu.has-actions > .header-navigation {
    display: flex;
  }
  .header-menu.has-actions > .menu-toggle {
    display: none;
  }
}
.header-menu > .header-navigation,
.header-menu > .header-navigation nav,
.header-menu > .header-navigation .menu-actions {
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.header-menu > .header-navigation nav,
.header-menu > .header-navigation .menu-actions {
  display: flex;
}
.header-menu > .header-navigation .menu-link {
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  white-space: nowrap;
}
.header-menu > .header-navigation .menu-link strong {
  font-size: 13px;
}
.header-menu > .header-navigation .menu-link > .app-icon {
  width: 18px;
  height: 18px;
}
.header-menu > .header-navigation .menu-link small,
.header-menu > .header-navigation .menu-arrow,
.header-menu > .header-navigation .menu-actions > .eyebrow {
  display: none;
}
.header-menu > .header-navigation .menu-actions {
  margin: 0;
  padding: 0;
  border: 0;
}
.header-menu > .header-navigation .menu-actions :deep(button) {
  width: auto;
  min-height: 44px;
  padding: 8px 12px;
  gap: 8px;
  font-size: 12px;
  white-space: nowrap;
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
@media (max-height: 480px) and (min-width: 520px) {
  .fullscreen-menu.has-player {
    padding-right: 240px;
    padding-bottom: 0;
  }
  .menu-top {
    padding-inline: 12px;
  }
  .menu-brand {
    --brand-logo-width: 120px;
  }
  .menu-content h2 {
    margin-bottom: 14px;
  }
  .menu-body {
    padding: 12px;
  }
}
</style>
