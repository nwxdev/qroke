<script setup lang="ts">
const $fetch = usePartyFetch()
const { id: activePartyId } = usePartyRoute()
const pinLength = computed(() => (activePartyId.value.startsWith('f1.') ? 6 : 4))
const props = defineProps<{ tv?: boolean }>()
const { api, act, pending, admin, adminLeaseSeconds, failure } = useParty()
const { remaining, remainingLabel } = useAdminLease()
const occupied = computed(() => !admin.value && remaining.value > 0)
const pin = ref('')
async function submit() {
  if (occupied.value) return
  await act(async () => {
    const access = await $fetch<{ role: 'owner' | 'guest' | null }>('/api/access')
    if (access.role === 'guest') await api('/api/access', { pin: pin.value })
    await api('/api/auth', { action: 'login', pin: pin.value })
  })
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
    <BrandLogo class="unlock-brand" />
    <span class="eyebrow">CONTROLE DA FESTA</span>
    <h2>Você comanda o som.</h2>
    <p>Digite o PIN do anfitrião para liberar os controles.</p>
    <p v-if="occupied" class="notice" role="status">
      Outro anfitrião está no controle por {{ remainingLabel }}. Aguarde ou peça para ele sair.
    </p>
    <p v-if="failure" class="notice error" role="alert">{{ failure }}</p>
    <form @submit.prevent="submit">
      <label class="sr-only" for="host-pin">PIN do anfitrião</label
      ><input
        id="host-pin"
        v-model="pin"
        type="password"
        inputmode="numeric"
        autocomplete="off"
        :minlength="pinLength"
        maxlength="8"
        :readonly="tv"
        required
        :disabled="pending || occupied"
        placeholder="••••••"
        class="pin-input"
      />
      <div v-if="tv" class="pin-grid">
        <button
          v-for="digitKey in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0']"
          :key="digitKey"
          type="button"
          :disabled="pending || occupied"
          :aria-label="digitKey === '⌫' ? 'Apagar dígito' : digitKey"
          @click="digit(digitKey)"
        >
          {{ digitKey }}</button
        ><button type="submit" :disabled="pending || occupied || pin.length < pinLength">OK</button>
      </div>
      <QBtn
        v-else
        type="submit"
        color="primary"
        no-caps
        :loading="pending"
        :disable="occupied || pin.length < pinLength"
      >
        <AppIcon name="unlock" class="on-left" /><span>Liberar controles</span>
      </QBtn>
    </form>
    <small
      >O controle fica reservado por {{ adminLeaseSeconds }} segundos. Depois, qualquer anfitrião
      pode solicitar novamente.</small
    >
  </section>
</template>
