<script setup lang="ts">
const props = defineProps<{ tv?: boolean }>()
const { api, act, pending } = useParty()
const pin = ref('')
async function submit() {
  await act(() => api('/api/auth', { action: 'login', pin: pin.value }))
  pin.value = ''
}
function digit(key: string) {
  if (key === '⌫') pin.value = pin.value.slice(0, -1)
  else if (pin.value.length < 8) pin.value += key
}
function key(event: KeyboardEvent) {
  if (!props.tv) return
  if (/^\d$/.test(event.key)) {
    event.preventDefault()
    digit(event.key)
  }
}
onMounted(() => window.addEventListener('keydown', key))
onBeforeUnmount(() => window.removeEventListener('keydown', key))
</script>
<template>
  <section class="unlock panel">
    <span class="eyebrow">CONTROLE DA FESTA</span>
    <h2>Você comanda o som.</h2>
    <p>Digite o PIN do anfitrião para liberar os controles.</p>
    <form @submit.prevent="submit">
      <label class="sr-only" for="host-pin">PIN do anfitrião</label
      ><input
        id="host-pin"
        v-model="pin"
        type="password"
        inputmode="numeric"
        autocomplete="off"
        minlength="4"
        maxlength="8"
        :readonly="tv"
        required
        :disabled="pending"
        placeholder="••••"
        class="pin-input"
      />
      <div v-if="tv" class="pin-grid">
        <button
          v-for="digitKey in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0']"
          :key="digitKey"
          type="button"
          :disabled="pending"
          :aria-label="digitKey === '⌫' ? 'Apagar dígito' : digitKey"
          @click="digit(digitKey)"
        >
          {{ digitKey }}</button
        ><button type="submit" :disabled="pending || pin.length < 4">OK</button>
      </div>
      <QBtn
        v-else
        type="submit"
        color="primary"
        no-caps
        :loading="pending"
        :disable="pin.length < 4"
        label="Liberar controles"
      />
    </form>
    <small>A sessão expira após 5 minutos sem interação.</small>
  </section>
</template>
