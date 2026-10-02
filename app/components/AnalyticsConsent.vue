<script setup lang="ts">
const { choice, ready, opened, enabled, publicPage, choose } = useAnalyticsConsent()
const visible = computed(
  () => ready.value && enabled.value && publicPage.value && (!choice.value || opened.value),
)
const panel = ref<HTMLElement | null>(null)
const detailsButton = ref<HTMLButtonElement | null>(null)
const expanded = ref(false)
watch(visible, (value) => {
  if (!value) expanded.value = false
})
watch(opened, async (value) => {
  if (value) {
    await nextTick()
    panel.value?.focus()
  }
})
function restoreFocus() {
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-analytics-settings]')?.focus())
}
function close() {
  if (!choice.value) return
  opened.value = false
  restoreFocus()
}
function escape() {
  if (expanded.value) {
    expanded.value = false
    nextTick(() => detailsButton.value?.focus())
  } else if (opened.value) close()
}
function save(value: 'accepted' | 'declined') {
  const returnFocus = opened.value
  choose(value)
  if (returnFocus) restoreFocus()
}
</script>
<template>
  <div v-if="visible" class="analytics-consent-slot">
    <aside
      ref="panel"
      class="analytics-consent"
      aria-labelledby="analytics-heading"
      tabindex="-1"
      @keydown.esc="escape"
    >
      <div class="analytics-copy">
        <div class="analytics-heading-row">
          <AppIcon name="lock" />
          <h2 id="analytics-heading">Cookies opcionais</h2>
          <button
            v-if="choice"
            class="analytics-close"
            type="button"
            aria-label="Fechar preferências de medição"
            @click="close"
          >
            <AppIcon name="close" />
          </button>
        </div>
        <p>
          Usamos o Google Analytics para entender visitas às páginas públicas, só se você permitir.
        </p>
        <p v-if="choice" class="current-choice">
          Sua escolha: {{ choice === 'accepted' ? 'medição aceita' : 'medição recusada' }}.
        </p>
      </div>
      <div class="analytics-actions">
        <button
          ref="detailsButton"
          class="analytics-details-toggle"
          type="button"
          :aria-expanded="expanded"
          aria-controls="analytics-details"
          :aria-label="expanded ? 'Ocultar detalhes sobre cookies' : 'Detalhes sobre cookies'"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Ocultar' : 'Detalhes' }}
        </button>
        <button
          class="analytics-choice"
          type="button"
          aria-label="Recusar medição"
          @click="save('declined')"
        >
          Recusar
        </button>
        <button
          class="analytics-choice"
          type="button"
          aria-label="Aceitar medição"
          @click="save('accepted')"
        >
          Aceitar
        </button>
      </div>
      <div v-if="expanded" id="analytics-details" class="analytics-details">
        <p>
          Após seu aceite, o Google recebe dados de navegação e do aparelho, como página visitada e
          tipo de navegador, e usa cookies para reconhecer visitas. Não enviamos nomes, buscas, PINs
          ou links de convite. A medição não acompanha as telas das festas e os recursos de
          publicidade ficam desativados.
        </p>
        <p>
          Você pode mudar a escolha em “Preferências de medição”, no rodapé. Ao recusar,
          interrompemos a coleta e removemos os cookies de medição deste navegador. Isso não apaga
          dados já recebidos pelo Google. A escolha não muda o funcionamento da festa.
        </p>
        <div class="analytics-policy-links">
          <NuxtLink to="/politica-de-privacidade">Política de Privacidade do QRokê</NuxtLink>
          <a
            href="https://policies.google.com/privacy?hl=pt-BR"
            target="_blank"
            rel="noopener noreferrer"
            >Privacidade do Google ↗</a
          >
        </div>
      </div>
    </aside>
  </div>
</template>
<style scoped>
/* The sticky slot keeps its space at the end of the document, so the footer can
   scroll fully above the notice. Only the card receives pointer events. */
.analytics-consent-slot {
  position: sticky;
  bottom: 0;
  z-index: 45;
  padding: 12px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  pointer-events: none;
}
.analytics-consent {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 24px;
  width: min(1080px, 100%);
  margin: auto;
  max-height: calc(100dvh - var(--qroke-install-space, 0px) - 24px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
  pointer-events: auto;
}
.analytics-heading-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.analytics-heading-row > .app-icon {
  width: 18px;
  height: 18px;
  color: var(--muted);
  flex-shrink: 0;
}
h2 {
  font-size: 15px;
  letter-spacing: 0;
}
p {
  font-size: 13px;
  line-height: 1.5;
}
.analytics-copy > p {
  margin-top: 4px;
}
.current-choice {
  font-size: 12px;
}
.analytics-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.analytics-actions button {
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
}
.analytics-choice {
  flex: 1;
  min-width: 82px;
  background: var(--surface-2);
  color: var(--text);
}
.analytics-details-toggle {
  background: transparent;
  border-color: transparent;
  padding-inline: 8px;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: var(--muted);
}
.analytics-close {
  display: inline-grid;
  place-items: center;
  margin-left: auto;
  padding: 10px;
  background: transparent;
  border-color: transparent;
}
.analytics-close .app-icon {
  width: 18px;
  height: 18px;
}
.analytics-details {
  grid-column: 1 / -1;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
.analytics-details p + p {
  margin-top: 10px;
}
.analytics-policy-links {
  display: flex;
  flex-wrap: wrap;
  column-gap: 24px;
  margin-top: 4px;
}
.analytics-policy-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (max-width: 720px) {
  .analytics-consent {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
  }
  .analytics-actions {
    justify-content: flex-end;
  }
  .analytics-details-toggle {
    margin-right: auto;
  }
}
</style>
