<script setup lang="ts">
import { parsePartyInvite, type PartyInvite } from '../utils/party-invite'
const opened = useState('qroke:join-open', () => false)
const { isPlayer, state } = useParty()
const { id } = usePartyRoute()
const route = useRoute()
const dialog = ref<HTMLDialogElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const link = ref('')
const camera = ref(false)
const busy = ref(false)
const failure = ref('')
const confirmation = ref<PartyInvite | null>(null)
let returnFocus: HTMLElement | null = null
let previousOverflow = ''
let generation = 0
function openCamera() {
  camera.value = true
  failure.value = ''
}
function close() {
  opened.value = false
}
function closeDialog() {
  generation++
  camera.value = false
  busy.value = false
  confirmation.value = null
  dialog.value?.close()
  document.documentElement.style.overflow = previousOverflow
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
}
async function syncDialog(open: boolean) {
  if (open) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.documentElement.style.overflow
    link.value = ''
    failure.value = ''
    confirmation.value = null
    await nextTick()
    if (!opened.value) return
    dialog.value?.show()
    document.documentElement.style.overflow = 'hidden'
    dialog.value?.querySelector<HTMLButtonElement>('.join-close')?.focus()
  } else closeDialog()
}
watch(opened, syncDialog, { flush: 'post' })
onMounted(() => {
  if (opened.value) void syncDialog(true)
})
watch(() => route.fullPath, close)
watch([camera, confirmation], async () => {
  await nextTick()
  if (opened.value && !dialog.value?.contains(document.activeElement))
    dialog.value?.querySelector<HTMLButtonElement>('.join-close')?.focus()
})
async function enter(invite: PartyInvite) {
  if (busy.value) return
  const attempt = ++generation
  busy.value = true
  failure.value = ''
  confirmation.value = null
  try {
    const prefix = invite.partyId ? '/api/f/' + invite.partyId : '/api'
    let role = 'guest'
    let partyId = invite.partyId
    let scoped = !!invite.partyId
    if (invite.token) {
      const access = await $fetch<{ role: string; scoped: boolean; partyId: string }>(
        prefix + '/access',
        {
          method: 'POST',
          body: { token: invite.token, ...(partyId ? { partyId } : {}) },
          timeout: 10000,
        },
      )
      role = access.role
      partyId = access.partyId
      scoped = access.scoped
    } else {
      const access = await $fetch<{ authorized: boolean; role: string }>(prefix + '/access', {
        timeout: 10000,
      })
      if (!access.authorized)
        throw new Error(
          'Esse link não contém o convite completo. Peça um novo link ou QR Code ao anfitrião.',
        )
      role = access.role
    }
    if (attempt !== generation || !opened.value) return
    const destination = (scoped ? '/f/' + partyId : '') + (role === 'owner' ? '/host' : '/busca')
    close()
    await navigateTo(destination, { external: (scoped ? partyId : '') !== id.value })
  } catch (error) {
    if (attempt !== generation || !opened.value) return
    const status = (error as { statusCode?: number }).statusCode
    failure.value =
      status === 410
        ? 'Esta festa terminou. Peça um convite de uma festa ativa.'
        : status === 404
          ? 'Não encontramos esta festa. Confira o link com o anfitrião.'
          : errorText(error)
  } finally {
    if (attempt === generation) busy.value = false
  }
}
function submit(value = link.value) {
  if (busy.value) return
  camera.value = false
  link.value = value
  failure.value = ''
  const invite = parsePartyInvite(value, location.origin)
  if (!invite) {
    failure.value = 'Use um link ou QR Code de festa do QRokê neste site.'
    void nextTick(() => field.value?.focus())
    return
  }
  if (isPlayer.value && state.value?.current && invite.partyId !== id.value) {
    confirmation.value = invite
    return
  }
  void enter(invite)
}
function key(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,a[href]',
    ) || [],
  ).filter((item) => item.getClientRects().length)
  if (!items.length) return
  const first = items[0]!,
    last = items.at(-1)!
  if (
    event.shiftKey &&
    (document.activeElement === first || !dialog.value?.contains(document.activeElement))
  ) {
    event.preventDefault()
    last.focus()
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !dialog.value?.contains(document.activeElement))
  ) {
    event.preventDefault()
    first.focus()
  }
}
onBeforeUnmount(() => {
  opened.value = false
  if (dialog.value?.open) closeDialog()
})
</script>
<template>
  <Teleport to="body">
    <div v-if="opened" class="join-backdrop" @click="close" />
    <dialog
      ref="dialog"
      class="join-party-dialog"
      :class="{ 'with-player': isPlayer }"
      aria-label="Entrar na festa"
      aria-modal="true"
      @keydown="key"
      @cancel.prevent="close"
      @close="!dialog?.open && close()"
    >
      <div class="join-heading">
        <h2>Entrar na festa</h2>
        <button
          type="button"
          class="icon-button join-close"
          aria-label="Fechar entrada na festa"
          @click="close"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <div v-if="confirmation" class="join-confirm">
        <p>
          Este aparelho está tocando. Entrar em outra festa interrompe a reprodução dele na festa
          atual.
        </p>
        <button type="button" class="join-primary" @click="enter(confirmation)">
          Entrar na outra festa
        </button>
        <button type="button" @click="confirmation = null">Continuar nesta festa</button>
      </div>
      <template v-else-if="camera">
        <QrCamera @read="submit" />
        <button type="button" class="join-alternative" @click="camera = false">
          Usar link da festa
        </button>
      </template>
      <template v-else>
        <form @submit.prevent="submit()">
          <label for="party-invite-link">Link da festa</label>
          <input
            id="party-invite-link"
            ref="field"
            v-model="link"
            type="text"
            inputmode="url"
            autocomplete="off"
            autocapitalize="none"
            :spellcheck="false"
            maxlength="2048"
            placeholder="Cole o convite aqui"
            :disabled="busy"
            :aria-invalid="!!failure"
            :aria-describedby="failure ? 'join-party-error' : undefined"
          />
          <button type="submit" class="join-primary" :disabled="busy || !link.trim()">
            {{ busy ? 'Entrando…' : 'Entrar com link' }}
          </button>
        </form>
        <p v-if="failure" id="join-party-error" class="notice" role="alert">{{ failure }}</p>
        <NuxtLink class="join-tv" to="/tv" @click="close"
          ><AppIcon name="tv" /> Entrar com a TV / Código</NuxtLink
        >
        <span class="join-or">ou</span>
        <button type="button" class="join-scan" :disabled="busy" @click="openCamera">
          <AppIcon name="qr" /> Escanear QR Code
        </button>
        <small class="join-camera-note">Ao abrir a câmera, permita o acesso para ler o QR.</small>
      </template>
    </dialog>
  </Teleport>
</template>
<style scoped>
.join-backdrop {
  position: fixed;
  inset: 0;
  z-index: 108;
  background: #0009;
}
.join-party-dialog {
  position: fixed;
  z-index: 110;
  top: max(16px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - 32px - var(--qroke-dock-space, 0px));
  margin: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  color: var(--text);
  background: var(--surface);
  overflow: auto;
  overscroll-behavior: contain;
}
.join-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
h2 {
  font-size: 22px;
  margin: 0;
}
.join-close {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
}
form,
.join-confirm {
  display: grid;
  gap: 12px;
}
input {
  width: 100%;
  min-width: 0;
}
button {
  min-height: 44px;
}
.join-primary {
  color: var(--on-accent);
  background: var(--accent);
  font-weight: 700;
}
.join-or {
  display: block;
  text-align: center;
  color: var(--muted);
  padding: 16px 0;
}
.join-scan,
.join-alternative {
  width: 100%;
}
.join-scan {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.join-alternative {
  margin-top: 16px;
}
.join-camera-note {
  display: block;
  margin-top: 12px;
  font-size: 12px;
}
@media (max-height: 480px) and (min-width: 520px) {
  .join-party-dialog.with-player {
    left: 12px;
    transform: none;
    width: calc(100vw - 252px);
    max-height: calc(100dvh - 32px);
  }
}
.join-tv {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 12px;
}
</style>
