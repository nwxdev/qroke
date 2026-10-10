<script setup lang="ts">
import type { PartyInfo } from '#shared/parties'
const request = usePartyFetch(),
  { id, href } = usePartyRoute()
const pin = ref(''),
  failure = ref(''),
  pending = ref(false),
  details = ref<PartyInfo | null>(null)
const route = useRoute()
const joinOpen = useState('qroke:join-open', () => false)
async function enter() {
  if (pending.value) return
  pending.value = true
  failure.value = ''
  try {
    const query = new URLSearchParams(location.hash.slice(1))
    const token = query.get('convite')
    const partyId =
      id.value ||
      query.get('festa') ||
      (typeof route.query.festa === 'string' ? route.query.festa : undefined)
    const access = await request<{ role: string; scoped: boolean; partyId: string }>(
      '/api/access',
      {
        method: 'POST',
        body: token && !pin.value ? { token, partyId } : { pin: pin.value, partyId },
      },
    )
    const prefix = access.scoped ? '/f/' + access.partyId : ''
    history.replaceState(null, '', prefix + '/entrar')
    sessionStorage.removeItem('qroke:device' + (access.scoped ? ':' + access.partyId : ''))
    if (access.role === 'owner' && pin.value) {
      try {
        await request((access.scoped ? '/api/f/' + access.partyId : '/api') + '/auth', {
          method: 'POST',
          body: { action: 'login', pin: pin.value },
        })
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode !== 409) throw error
      }
    }
    await navigateTo(prefix + (access.role === 'owner' ? '/host' : '/busca'), { external: true })
  } catch (error) {
    if (id.value && (error as { statusCode?: number }).statusCode === 410)
      return navigateTo(href('/encerrada'), { external: true })
    failure.value = errorText(error)
  } finally {
    pending.value = false
  }
}
onMounted(async () => {
  if (id.value) {
    try {
      details.value = (await request<{ party: PartyInfo }>('/api/party')).party
      if (details.value.status !== 'active')
        return navigateTo(href('/encerrada'), { external: true })
      const access = await request<{ authorized: boolean; role: string }>('/api/access')
      if (access.authorized)
        return navigateTo(href(access.role === 'owner' ? '/host' : '/busca'), { external: true })
    } catch (error) {
      failure.value = errorText(error)
      return
    }
  }
  if (location.hash.includes('convite=')) void enter()
})
</script>
<template>
  <main class="entry-card">
    <a href="/" aria-label="QRokê, início"><BrandLogo /></a>
    <span v-if="details" class="eyebrow entry-party-name">{{ details.name }}</span>
    <h1>Entre na festa</h1>
    <p>
      {{
        details?.createdAt
          ? 'Abra o convite. O dono define os DJs no painel de dispositivos.'
          : 'Abra o convite ou entre com seu PIN.'
      }}
    </p>
    <button type="button" class="entry-join" @click="joinOpen = true">
      <AppIcon name="qr" /> Entrar com link ou QR Code
    </button>
    <form v-if="!details?.createdAt" @submit.prevent="enter">
      <label for="host-pin">Acesso do anfitrião</label>
      <input
        id="host-pin"
        v-model="pin"
        type="password"
        inputmode="numeric"
        maxlength="8"
        autocomplete="current-password"
        placeholder="PIN do anfitrião"
      />
      <button :disabled="pending || !pin">
        {{ pending ? 'Entrando…' : 'Entrar como anfitrião' }}
      </button>
    </form>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <LegalLinks new-tab />
    <a class="entry-home" href="/">Criar uma festa ou ver suas festas</a>
  </main>
</template>
<style scoped>
.entry-join {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 20px;
}
.entry-card {
  max-width: 440px;
  margin: 10vh auto;
  padding: 28px;
}
.entry-party-name {
  margin: 24px 0 12px;
  overflow-wrap: anywhere;
}
.entry-description {
  margin-block: 20px 12px;
}
form {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}
input {
  padding: 12px;
  border-radius: 8px;
}
.entry-home {
  display: block;
  margin-top: 28px;
  color: var(--muted);
  text-decoration: underline;
  font-size: 13px;
}
</style>
