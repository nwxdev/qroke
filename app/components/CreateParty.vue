<script setup lang="ts">
import type { PartyInfo, MyParty } from '#shared/parties'
const name = ref(''),
  pin = ref(''),
  confirmation = ref(''),
  failure = ref(''),
  busy = ref(false)
const ready = ref(false),
  parties = ref<MyParty[]>([]),
  now = ref(Date.now()),
  offset = ref(0)
let idempotencyKey = '',
  refreshTimer: ReturnType<typeof setInterval>,
  timer: ReturnType<typeof setInterval>
let loading: Promise<void> | undefined
function load() {
  return (loading ||= refreshList().finally(() => {
    loading = undefined
  }))
}
async function refreshList() {
  try {
    const result = await $fetch<{ parties: MyParty[]; serverTime: number }>('/api/parties')
    parties.value = result.parties
    offset.value = result.serverTime - Date.now()
    ready.value = true
  } catch {
    failure.value = 'Não foi possível conectar. Tente novamente.'
  }
}
function remaining(party: PartyInfo) {
  if (!party.expiresAt) return 'Festa original'
  const minutes = Math.max(0, Math.ceil((party.expiresAt - now.value - offset.value) / 60000))
  return minutes >= 60
    ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'min restantes'
    : minutes + 'min restantes'
}
const active = computed(() =>
  parties.value.filter((p) => !p.expiresAt || p.expiresAt > now.value + offset.value),
)
async function create() {
  if (busy.value) return
  failure.value = ''
  if (pin.value !== confirmation.value) {
    failure.value = 'Os PINs precisam ser iguais.'
    return
  }
  if (!ready.value) {
    await load()
    if (!ready.value) return
  }
  busy.value = true
  try {
    idempotencyKey ||= crypto.randomUUID()
    const result = await $fetch<{ url: string }>('/api/parties', {
      method: 'POST',
      body: { name: name.value, pin: pin.value, idempotencyKey },
      timeout: 15000,
    })
    await navigateTo(result.url, { external: true })
  } catch (error) {
    failure.value = errorText(error)
  } finally {
    busy.value = false
  }
}
const visible = () => {
  if (!document.hidden) void load()
}
onMounted(() => {
  void load()
  refreshTimer = setInterval(() => {
    if (!document.hidden) void load()
  }, 15000)
  document.addEventListener('visibilitychange', visible)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', visible)
})
</script>
<template>
  <main class="party-home">
    <header><BrandLogo /></header>
    <div class="home-grid">
      <section class="home-intro">
        <h1>Sua festa.<br />Sua música.</h1>
        <p>Crie, compartilhe e dê o play.</p>
        <section v-if="active.length" class="my-parties" aria-labelledby="my-parties-title">
          <h2 id="my-parties-title">Suas festas</h2>
          <ul>
            <li v-for="party in active" :key="party.id">
              <div>
                <strong>{{ party.name }}</strong
                ><small>{{ remaining(party) }}</small>
              </div>
              <a
                :href="'/f/' + party.id + (party.role === 'owner' ? '/host' : '/busca')"
                :aria-label="'Retomar festa ' + party.name"
                >Retomar festa <span aria-hidden="true">→</span></a
              >
            </li>
          </ul>
        </section>
      </section>
      <section class="create-party-card" aria-labelledby="create-title">
        <h2 id="create-title">Criar festa</h2>
        <p>Disponível por 24 horas ou até você encerrar.</p>
        <form @submit.prevent="create">
          <label for="party-name">Nome da festa</label>
          <input
            id="party-name"
            v-model="name"
            required
            minlength="2"
            maxlength="80"
            placeholder="Ex.: Sextou na casa da Ana"
            autocomplete="off"
          />
          <label for="party-pin">PIN do administrador</label>
          <input
            id="party-pin"
            v-model="pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]{6}"
            minlength="6"
            maxlength="6"
            required
            autocomplete="new-password"
            placeholder="Crie um PIN de 6 dígitos"
          />
          <label for="party-pin-confirm">Confirmar PIN</label>
          <input
            id="party-pin-confirm"
            v-model="confirmation"
            type="password"
            inputmode="numeric"
            pattern="[0-9]{6}"
            minlength="6"
            maxlength="6"
            required
            autocomplete="new-password"
            placeholder="Repita o PIN"
          />
          <small>Guarde o PIN para administrar a festa.</small>
          <p v-if="failure" class="notice" role="alert">{{ failure }}</p>
          <button class="create-party-button" :disabled="busy">
            {{ busy ? 'Criando sua festa…' : 'Criar festa' }}
          </button>
        </form>
        <p class="invite-hint">Tem um convite? Abra o link ou escaneie o QR.</p>
      </section>
    </div>
  </main>
</template>
<style scoped>
.party-home {
  max-width: 1200px;
  margin: auto;
  padding: 32px 5% 56px;
}
.party-home header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}
.home-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--muted);
}
.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 8%;
  padding-top: 64px;
  align-items: start;
}
.home-intro h1 {
  font-size: clamp(40px, 5vw, 68px);
  margin: 22px 0;
  max-width: 580px;
}
.home-intro > p {
  font-size: 18px;
  max-width: 480px;
}
.home-features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}
.home-features span {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 24px;
  font-size: 12px;
  color: var(--muted);
}
.create-party-card {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--surface);
}
.create-party-card h2 {
  font-size: 28px;
  margin: 8px 0 12px;
}
.create-party-card form {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}
.create-party-card label {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
}
.create-party-card input {
  width: 100%;
  min-width: 0;
  background: var(--bg);
}
.create-party-button {
  margin-top: 12px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  min-height: 50px;
}
.invite-hint {
  border-top: 1px solid var(--line);
  margin-top: 24px;
  padding-top: 20px;
  font-size: 12px;
}
.my-parties {
  margin-top: 44px;
}
.my-parties > p {
  font-size: 13px;
  margin-top: 6px;
}
.my-parties ul {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.my-parties li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.my-parties li div {
  min-width: 0;
}
.my-parties strong {
  display: block;
  overflow-wrap: anywhere;
}
.my-parties small {
  display: block;
}
.my-parties a {
  color: var(--accent);
  font-size: 12px;
  white-space: nowrap;
  padding-block: 10px;
}
@media (max-width: 760px) {
  .home-grid {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-top: 32px;
  }
  .home-label {
    display: none;
  }
  .party-home header {
    padding-bottom: 20px;
  }
  .home-intro h1 {
    font-size: 32px;
    margin: 0 0 8px;
  }
  .home-intro > p {
    margin: 0;
    font-size: 14px;
  }
  .my-parties {
    margin-top: 20px;
  }
  .create-party-card {
    padding: 22px;
  }
}
</style>
