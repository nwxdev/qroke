<script setup lang="ts">
import type { PartyInfo, MyParty } from '#shared/parties'
const props = defineProps<{ creating?: boolean }>()
const name = ref(''),
  pin = ref(''),
  confirmation = ref(''),
  failure = ref(''),
  busy = ref(false)
const joinOpen = useState('qroke:join-open', () => false)
const nameInput = ref<HTMLInputElement | null>(null)
const nameReady = computed(() => name.value.trim().length >= 2)
const pinReady = computed(() => /^[0-9]{6}$/.test(pin.value))
const confirmationReady = computed(() => pinReady.value && confirmation.value === pin.value)
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
  if (props.creating) nameInput.value?.focus({ preventScroll: true })
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
    <header>
      <BrandLogo />
      <div class="home-preferences"><MotionToggle compact /><ThemeToggle /></div>
    </header>
    <div class="home-grid" :class="{ 'home-grid--creating': creating }">
      <MotionReveal v-if="!creating" as="section" class="home-intro" immediate>
        <span class="home-kicker"><AppIcon name="sparkles" /> QRokê · SUA GALERA. SEU PALCO.</span>
        <h1>Música e karaokê<br /><span>para sua festa.</span></h1>
        <p>
          O QRokê é um aplicativo de música e karaokê para festas. Crie uma fila compartilhada,
          convide pelo QR Code e deixe a galera pedir músicas e votar nas próximas. Funciona no
          navegador do celular, computador ou TV.
        </p>
        <div class="home-actions">
          <ActionButton class="home-join" variant="secondary" icon="qr" @click="joinOpen = true">
            Entrar na festa
          </ActionButton>
          <small class="home-join-hint"
            >Já tem um convite? Escaneie o QR Code ou cole o link.</small
          >
          <ActionButton class="home-create" icon="sparkles" to="/criar-festa" id="criar-festa">
            CRIAR FESTA
          </ActionButton>
          <small class="home-create-hint">Você cria o palco. A galera escolhe a trilha.</small>
        </div>
        <NuxtLink class="home-guide-link" to="/como-funciona"
          >Veja como funciona <AppIcon name="arrow-right"
        /></NuxtLink>
        <div class="home-feature-strip" aria-label="Recursos da festa">
          <span><AppIcon name="qr" /> Convide</span>
          <span><AppIcon name="like" /> Vote</span>
          <span><AppIcon name="microphone" /> Cante</span>
        </div>
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
      </MotionReveal>
      <MotionReveal
        v-if="!creating"
        as="section"
        class="party-preview"
        immediate
        aria-labelledby="preview-title"
      >
        <span class="create-card-icon"><AppIcon name="microphone" /></span>
        <span class="eyebrow">UMA FESTA, MUITAS VOZES</span>
        <h2 id="preview-title">A próxima música<br />é com vocês.</h2>
        <ol class="party-steps">
          <li>
            <span class="step-number">1</span>
            <div>
              <h3>Crie e convide</h3>
              <p>Dê um nome à festa e compartilhe o convite por QR Code.</p>
            </div>
          </li>
          <li>
            <span class="step-number">2</span>
            <div>
              <h3>Escolham as músicas</h3>
              <p>Busquem no YouTube, adicionem à fila e votem nas favoritas.</p>
            </div>
          </li>
          <li>
            <span class="step-number">3</span>
            <div>
              <h3>Soltem a voz</h3>
              <p>O anfitrião controla o player. A galera participa pelo celular.</p>
            </div>
          </li>
        </ol>
        <p class="preview-note">
          <AppIcon name="sparkles" /> Para começar uma festa, não é preciso conectar uma conta
          Google.
        </p>
      </MotionReveal>
      <MotionReveal
        v-if="creating"
        as="section"
        class="create-party-card"
        immediate
        aria-labelledby="create-title"
      >
        <div class="create-card-heading">
          <span class="create-card-icon"><AppIcon name="microphone" /></span>
          <span class="create-card-badge">O SHOW COMEÇA AQUI</span>
        </div>
        <NuxtLink class="create-back" to="/">← Conheça o QRokê</NuxtLink>
        <h1 id="create-title">Dê um nome à sua festa.</h1>
        <p>Prepare o convite e chame a galera. A festa fica disponível por até 24 horas.</p>
        <PartySetupProgress
          :name-ready="nameReady"
          :pin-ready="pinReady"
          :confirmation-ready="confirmationReady"
        />
        <form @submit.prevent="create">
          <label for="party-name">Nome da festa</label>
          <input
            ref="nameInput"
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
          <LegalNotice action="criar uma festa" />
          <ActionButton class="create-party-button" type="submit" icon="play" :busy="busy">
            {{ busy ? 'Criando sua festa…' : 'Começar a festa' }}
          </ActionButton>
        </form>
      </MotionReveal>
    </div>
    <section v-if="!creating" class="home-about" aria-labelledby="home-about-title">
      <span class="eyebrow">DO PRIMEIRO PEDIDO AO ÚLTIMO REFRÃO</span>
      <h2 id="home-about-title">Todo mundo ajuda a escolher a trilha.</h2>
      <p>
        Use o celular para pedir músicas, conferir playlists do YouTube e acompanhar a fila. Na hora
        do karaokê, escolha uma versão para cantar e convide uma dupla. O anfitrião mantém os
        controles e escolhe o aparelho que vai tocar o som.
      </p>
      <div class="home-how">
        <article>
          <span class="home-how-icon"><AppIcon name="qr" /></span>
          <h3>Convide com um QR</h3>
          <p>Todo mundo entra pelo próprio celular.</p>
        </article>
        <article>
          <span class="home-how-icon"><AppIcon name="like" /></span>
          <h3>A fila é da galera</h3>
          <p>Peça suas favoritas e vote nas próximas.</p>
        </article>
        <article>
          <span class="home-how-icon"><AppIcon name="microphone" /></span>
          <h3>Chegou seu refrão</h3>
          <p>Escolha o karaokê e chame uma dupla.</p>
        </article>
      </div>
      <div class="home-about-links">
        <NuxtLink to="/karaoke-online">Prepare seu karaokê</NuxtLink
        ><NuxtLink to="/perguntas-frequentes">Tire suas dúvidas</NuxtLink>
      </div>
    </section>
    <section v-if="!creating" class="home-google" aria-labelledby="google-title">
      <div>
        <span class="eyebrow">SUA CONTA, SUA ESCOLHA</span>
        <h2 id="google-title">Por que conectar o Google?</h2>
        <p>
          A conexão é opcional e permite consultar suas playlists do YouTube e escolher músicas para
          a festa. O QRokê solicita acesso de leitura ao YouTube; não altera suas playlists nem
          publica vídeos na sua conta.
        </p>
        <p>
          Usamos títulos, identificadores, canais e miniaturas para mostrar as playlists e seus
          vídeos. Os itens que você decide adicionar aparecem na fila da festa. A busca de vídeos
          públicos não exige que você conecte sua conta.
        </p>
      </div>
      <div class="home-data-card">
        <h3>Transparência sobre seus dados</h3>
        <p>
          A senha da sua conta é informada somente ao Google. As credenciais de autorização são
          protegidas no servidor do QRokê. Não solicitamos acesso ao Gmail, Drive ou contatos.
        </p>
        <p>
          O QRokê não oferece geração ou edição de imagens por inteligência artificial e não usa
          dados das APIs do Google para treinar modelos de IA.
        </p>
        <p>
          Saiba o que coletamos, como usamos e por quanto tempo guardamos os dados na
          <NuxtLink to="/politica-de-privacidade">Política de Privacidade</NuxtLink>. Você pode
          desconectar a conta e revogar a autorização seguindo as
          <NuxtLink to="/exclusao-de-dados">instruções sobre seus dados</NuxtLink>.
        </p>
      </div>
    </section>
    <PublicSiteLinks />
  </main>
</template>
<style scoped>
.party-home {
  max-width: 1200px;
  margin: auto;
  padding: 24px 5% 48px;
}
.party-home header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.home-preferences {
  display: flex;
  align-items: center;
  gap: 8px;
}
.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 7%;
  padding-top: 48px;
  align-items: start;
}
.home-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}
.home-kicker .app-icon {
  width: 18px;
  height: 18px;
}
.home-intro h1 {
  font-size: clamp(40px, 4.8vw, 62px);
  margin: 18px 0 22px;
  max-width: 580px;
  line-height: 1.1;
}
.home-intro h1 > span {
  color: var(--accent);
}
.home-intro > p {
  font-size: 17px;
  line-height: 1.75;
  max-width: 470px;
}
.home-actions {
  display: grid;
  gap: 10px;
  margin-top: 28px;
  max-width: 430px;
}
.home-join-hint,
.home-create-hint {
  text-align: center;
  font-size: 11px;
}
.home-create {
  margin-top: 8px;
  font-size: 16px;
  letter-spacing: 0.6px;
}
.home-create-hint {
  margin-top: 4px;
}
.home-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 18px;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.home-guide-link .app-icon {
  width: 16px;
  height: 16px;
}
.home-feature-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
.home-feature-strip > span {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 8px 12px;
  border-radius: 24px;
  color: var(--muted);
  font-size: 12px;
}
.home-feature-strip .app-icon {
  width: 16px;
  height: 16px;
  color: var(--accent);
}
.create-party-card {
  position: relative;
  padding: 28px;
  border: 1px solid var(--line);
  border-top: 3px solid var(--accent);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
  scroll-margin-top: 32px;
}
.create-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.create-card-icon {
  display: grid;
  place-items: center;
  height: 48px;
  width: 48px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
  rotate: -6deg;
}
.create-card-icon .app-icon {
  width: 26px;
  height: 26px;
}
.create-card-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--muted);
}
.create-party-card h1 {
  font-size: 26px;
  margin: 18px 0 8px;
  letter-spacing: -0.8px;
}
.create-party-card > p {
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 22px;
}
.create-party-card form {
  display: grid;
  gap: 8px;
  margin-top: 20px;
}
.create-party-card label {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
}
.create-party-card input {
  width: 100%;
  min-width: 0;
  background: var(--bg);
  min-height: 48px;
  border-radius: 12px;
}
.create-party-card form > small {
  font-size: 11px;
}
.create-party-button {
  margin-top: 10px;
}
.my-parties {
  margin-top: 28px;
}
.my-parties h2 {
  font-size: 17px;
}
.my-parties ul {
  list-style: none;
  margin: 12px 0 0;
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
  background: var(--surface);
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
.home-about {
  margin-top: 64px;
  border-top: 1px solid var(--line);
  padding-top: 40px;
}
.home-about h2 {
  font-size: clamp(26px, 4vw, 36px);
  line-height: 1.25;
  margin: 16px 0;
  max-width: 650px;
}
.home-about > p {
  line-height: 1.75;
  font-size: 16px;
  max-width: 760px;
}
.home-how {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}
.home-how article {
  padding: 22px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
}
.home-how-icon {
  display: inline-grid;
  place-items: center;
  height: 38px;
  width: 38px;
  border-radius: 12px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  margin-bottom: 14px;
}
.home-how-icon .app-icon {
  width: 22px;
  height: 22px;
}
.home-how h3 {
  margin-bottom: 8px;
}
.home-how p {
  font-size: 13px;
}
.home-about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 24px;
}
.home-about-links a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 4px;
  padding-block: 8px;
}
@media (max-width: 760px) {
  .party-home {
    padding-top: 18px;
  }
  .party-home header {
    padding-bottom: 16px;
  }
  .party-home header :deep(.brand-logo) {
    --brand-logo-width: 165px;
  }
  .home-preferences {
    gap: 4px;
  }
  .home-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 28px;
  }
  .home-intro h1 {
    font-size: clamp(34px, 8.5vw, 48px);
    margin: 14px 0 16px;
  }
  .home-intro > p {
    font-size: 15px;
  }
  .home-actions {
    max-width: none;
    margin-top: 24px;
  }
  .create-party-card {
    padding: 22px;
  }
  .home-how {
    grid-template-columns: 1fr;
  }
  .home-about {
    margin-top: 44px;
  }
}
@media (max-width: 360px) {
  .party-home header :deep(.brand-logo) {
    --brand-logo-width: 140px;
  }
  .create-party-card {
    padding: 18px;
  }
}

.home-grid--creating {
  grid-template-columns: minmax(0, 540px);
  justify-content: center;
}
.create-back {
  display: inline-block;
  margin-top: 20px;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.party-preview {
  padding: 30px;
  border-radius: 28px;
  border: 1px solid var(--line);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--accent) 10%, var(--surface)),
    var(--surface) 65%
  );
  box-shadow: var(--shadow);
}
.party-preview > .eyebrow {
  display: block;
  margin-top: 28px;
}
.party-preview > h2 {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.2;
  margin: 14px 0 28px;
}
.party-steps {
  display: grid;
  gap: 24px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.party-steps li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.step-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
}
.party-steps h3 {
  font-size: 16px;
  margin-bottom: 5px;
}
.party-steps p,
.preview-note {
  font-size: 13px;
  line-height: 1.7;
}
.preview-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-top: 1px solid var(--line);
  padding-top: 20px;
  margin-top: 26px;
}
.preview-note .app-icon {
  flex-shrink: 0;
  color: var(--accent);
  margin-top: 2px;
}
.home-google {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  padding-top: 40px;
  margin-top: 44px;
  border-top: 1px solid var(--line);
}
.home-google h2 {
  font-size: 28px;
  line-height: 1.25;
  margin: 16px 0;
}
.home-google p {
  font-size: 14px;
  line-height: 1.8;
  margin-top: 14px;
}
.home-google a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.home-data-card {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}
@media (max-width: 760px) {
  .home-google {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .party-preview {
    padding: 24px;
  }
}
</style>
