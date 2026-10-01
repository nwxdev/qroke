<script setup lang="ts">
const { choice, ready, opened, enabled, publicPage, choose } = useAnalyticsConsent()
const visible = computed(
  () => ready.value && enabled.value && publicPage.value && (!choice.value || opened.value),
)
const panel = ref<HTMLElement | null>(null)
watch(opened, async (value) => {
  if (value) {
    await nextTick()
    panel.value?.focus()
  }
})
function save(value: 'accepted' | 'declined') {
  const returnFocus = opened.value
  choose(value)
  if (returnFocus)
    nextTick(() => document.querySelector<HTMLButtonElement>('[data-analytics-settings]')?.focus())
}
</script>
<template>
  <aside
    v-if="visible"
    ref="panel"
    class="analytics-consent"
    aria-labelledby="analytics-heading"
    tabindex="-1"
  >
    <h2 id="analytics-heading">Ajude o QRokê a melhorar</h2>
    <p>
      Podemos usar cookies do Google Analytics para entender as visitas às páginas públicas? A
      escolha é sua e não muda o funcionamento da festa.
    </p>
    <details>
      <summary>Como usamos esses dados</summary>
      <p>
        Após seu aceite, o Google recebe dados de navegação e do aparelho, como página visitada e
        tipo de navegador, e usa cookies para reconhecer visitas. Não enviamos nomes, buscas, PINs
        ou links de convite. A medição não acompanha as telas das festas e os recursos de
        publicidade ficam desativados.
      </p>
      <p>
        Você pode mudar a escolha em “Preferências de medição”, no rodapé. Ao recusar, interrompemos
        a coleta e removemos os cookies de medição deste navegador. Isso não apaga dados já
        recebidos pelo Google.
      </p>
      <NuxtLink to="/politica-de-privacidade">Política de Privacidade do QRokê</NuxtLink>
      <br />
      <a
        href="https://policies.google.com/privacy?hl=pt-BR"
        target="_blank"
        rel="noopener noreferrer"
        >Privacidade do Google ↗</a
      >
    </details>
    <p v-if="choice" class="current-choice">
      Sua escolha atual: {{ choice === 'accepted' ? 'medição aceita' : 'medição recusada' }}.
    </p>
    <div class="analytics-actions">
      <button type="button" @click="save('declined')">Recusar medição</button>
      <button type="button" @click="save('accepted')">Aceitar medição</button>
      <button v-if="choice" type="button" @click="opened = false">Fechar</button>
    </div>
  </aside>
</template>
<style scoped>
.analytics-consent {
  position: fixed;
  z-index: 95;
  inset: auto 16px max(16px, env(safe-area-inset-bottom));
  width: min(600px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
h2 {
  font-size: 19px;
  margin-bottom: 8px;
}
p {
  font-size: 14px;
  line-height: 1.55;
}
details {
  margin-top: 12px;
  font-size: 14px;
}
summary {
  cursor: pointer;
  padding: 6px 0;
}
details p {
  margin-top: 10px;
}
a {
  display: inline-block;
  text-decoration: underline;
  margin-top: 10px;
}
.current-choice {
  margin-top: 12px;
}
.analytics-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.analytics-actions button {
  flex: 1 1 160px;
  font-weight: 700;
}
</style>
