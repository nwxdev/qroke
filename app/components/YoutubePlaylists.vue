<script setup lang="ts">
const $fetch = usePartyFetch()
import type { PlaylistPreview, YoutubePlaylist, YoutubeStatus } from '../../shared/playlists'
const { refresh, session, state, queue } = useParty()
const playlistQueued = (id: string) =>
  [...queue.value, ...(state.value?.current ? [state.value.current] : [])].some(
    (track) => track.playlist?.id === id,
  )
const singers = ref<string[]>([])
const status = ref<YoutubeStatus | null>(null)
const remoteConnect = computed(() => {
  if (!status.value?.connectOrigin) return false
  const url = new URL(status.value.connectOrigin)
  return url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
})
const source = ref<'link' | 'mine'>('link')
const input = ref(''),
  karaoke = ref(false),
  busy = ref(false),
  failure = ref(''),
  notice = ref('')
const playlists = ref<YoutubePlaylist[]>([]),
  nextListPage = ref('')
const preview = ref<PlaylistPreview | null>(null),
  imported = ref(false)
const selected = ref({ input: '', personal: false })
let popup: Window | null = null
let controller: AbortController | undefined
async function task(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  notice.value = ''
  controller = new AbortController()
  try {
    await action()
  } catch (error) {
    if (!controller.signal.aborted) {
      failure.value = errorText(error)
      await session().catch(() => {})
      await loadStatus().catch(() => {})
    }
  } finally {
    busy.value = false
  }
}
async function loadStatus() {
  status.value = await $fetch<YoutubeStatus>('/api/youtube/status', { signal: controller?.signal })
}
function chooseSource(value: 'link' | 'mine') {
  source.value = value
  preview.value = null
  failure.value = ''
  notice.value = ''
  if (value === 'mine' && status.value?.connected && !playlists.value.length) void loadMine()
}
async function loadMine(append = false) {
  await task(async () => {
    const data = await $fetch<{ items: YoutubePlaylist[]; nextPageToken: string }>(
      '/api/youtube/playlists',
      {
        query: { pageToken: append ? nextListPage.value : '' },
        signal: controller?.signal,
      },
    )
    playlists.value = append ? [...playlists.value, ...data.items] : data.items
    nextListPage.value = data.nextPageToken
    if (!playlists.value.length)
      notice.value = 'Nenhuma playlist criada nesta conta foi encontrada.'
  })
}
async function inspect(value = input.value, personal = false, pageToken = '') {
  await task(async () => {
    preview.value = null
    imported.value = false
    selected.value = { input: value, personal }
    preview.value = await $fetch<PlaylistPreview>('/api/youtube/preview', {
      method: 'POST',
      body: { input: value, personal, pageToken, karaoke: karaoke.value },
      signal: controller?.signal,
      timeout: 120000,
    })
  })
}
async function add(videoId?: string) {
  if (!preview.value || imported.value) return
  await task(async () => {
    const result = await $fetch<{ added: number; duplicates: number }>('/api/youtube/import', {
      method: 'POST',
      body: { ticket: preview.value!.ticket, singers: singers.value, videoId },
      signal: controller?.signal,
    })
    imported.value = !videoId
    notice.value =
      result.added +
      ' música(s) adicionada(s) à fila.' +
      (result.duplicates ? ' ' + result.duplicates + ' já estava(m) na fila ou tocando.' : '')
    await refresh()
  })
}
async function expand(item: YoutubePlaylist) {
  if (preview.value?.playlist.id === item.id && selected.value.personal) {
    preview.value = null
    return
  }
  await inspect(item.id, true)
}
async function addAll(item: YoutubePlaylist) {
  await inspect(item.id, true)
  if (preview.value?.playlist.id === item.id) await add()
}
async function connect() {
  if (busy.value) return
  // Abrir no gesto do usuário evita bloqueadores e mantém o player nesta página.
  popup = window.open('about:blank', 'qroke-youtube-auth', 'popup,width=520,height=720')
  if (!popup) {
    failure.value = 'Permita pop-ups para conectar o YouTube sem sair do player.'
    return
  }
  await task(async () => {
    try {
      const result = await $fetch<{ url: string }>('/api/youtube/connect', {
        method: 'POST',
        body: {},
      })
      if (popup && !popup.closed) popup.location.href = result.url
    } catch (error) {
      popup?.close()
      throw error
    }
  })
}
async function disconnect() {
  await task(async () => {
    await $fetch('/api/youtube/disconnect', { method: 'POST', body: {} })
    playlists.value = []
    preview.value = null
    await loadStatus()
    notice.value =
      'Conta desconectada deste navegador. As músicas já adicionadas continuam na fila.'
  })
}
async function oauthMessage(event: MessageEvent) {
  if (
    event.origin !== location.origin ||
    event.source !== popup ||
    event.data?.type !== 'qroke-youtube'
  )
    return
  popup = null
  if (event.data.result !== 'connected') {
    failure.value =
      event.data.result === 'cancelled'
        ? 'Conexão cancelada. Você pode continuar usando um link público.'
        : 'Não foi possível conectar. Confira as credenciais, o redirecionamento e a permissão de leitura.'
    return
  }
  await task(loadStatus)
  if (status.value?.connected) {
    source.value = 'mine'
    await loadMine()
  }
}
watch(karaoke, () => {
  preview.value = null
})
onMounted(() => {
  window.addEventListener('message', oauthMessage)
  void task(loadStatus)
})
onBeforeUnmount(() => {
  controller?.abort()
  window.removeEventListener('message', oauthMessage)
})
</script>
<template>
  <section class="panel youtube-playlists" aria-labelledby="playlists-title" :aria-busy="busy">
    <div class="section-heading">
      <h2 id="playlists-title"><AppIcon name="playlist" /> Playlists do YouTube</h2>
      <span>Sua seleção para a festa</span>
    </div>
    <p>
      Traga uma playlist inteira para a fila. O player livre começa a tocar; os pedidos dos
      convidados entram no rodízio.
    </p>
    <div class="playlist-tabs" aria-label="Origem da playlist">
      <button :aria-pressed="source === 'link'" :disabled="busy" @click="chooseSource('link')">
        <AppIcon name="link" /> Colar link
      </button>
      <button :aria-pressed="source === 'mine'" :disabled="busy" @click="chooseSource('mine')">
        <AppIcon name="playlist" /> Minha conta
      </button>
    </div>
    <form v-if="source === 'link'" class="playlist-link" @submit.prevent="inspect()">
      <label for="youtube-playlist-link">Link da playlist</label>
      <div class="playlist-input-row">
        <input
          id="youtube-playlist-link"
          v-model="input"
          type="text"
          inputmode="url"
          enterkeyhint="go"
          placeholder="https://www.youtube.com/playlist?list=…"
          :disabled="busy"
          required
          maxlength="2048"
        />
        <button type="submit" :disabled="busy || !input.trim() || !status?.publicConfigured">
          <AppIcon name="search" /> Conferir
        </button>
      </div>
      <small
        >Públicas e não listadas: suas, da comunidade, de outros canais ou do próprio YouTube,
        quando disponíveis pela API. Mixes automáticos e listas especiais podem não estar
        disponíveis.</small
      >
      <p v-if="status && !status.publicConfigured" class="notice">
        Configure YOUTUBE_API_KEY no servidor para usar links públicos.
      </p>
    </form>
    <div v-else class="playlist-account">
      <template v-if="status?.connected">
        <div class="playlist-account-bar">
          <span><AppIcon name="check" /> Conta conectada neste navegador</span>
          <button :disabled="busy" @click="disconnect">Desconectar</button>
        </div>
        <p class="hint">
          Playlists criadas pela conta autorizada, incluindo privadas. O nome da playlist e as
          faixas adicionadas ficam visíveis para a festa. Sua conta continua privada.
        </p>
        <button :disabled="busy" @click="loadMine()">Atualizar playlists</button>
        <ul v-if="playlists.length" class="account-playlists">
          <li v-for="item in playlists" :key="item.id">
            <div class="playlist-result-actions">
              <button
                :disabled="busy"
                :aria-expanded="preview?.playlist.id === item.id && selected.personal"
                @click="expand(item)"
              >
                <img
                  v-if="item.thumbnail"
                  :src="item.thumbnail"
                  alt=""
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <span
                  ><strong>{{ item.title }}</strong
                  ><small>{{ item.channel }} · {{ item.count }} faixas</small></span
                >
                <span v-if="playlistQueued(item.id)" class="tag">Na fila</span>
                <AppIcon name="expand" />
              </button>
              <button
                class="add-all-playlist"
                :disabled="busy"
                :aria-label="'Adicionar todas de ' + item.title"
                title="Adicionar todas, sem duplicar faixas"
                @click="addAll(item)"
              >
                <AppIcon name="playlist-plus" />
              </button>
            </div>
            <PlaylistPreviewCard
              v-if="preview?.playlist.id === item.id && selected.personal"
              :preview="preview"
              :busy="busy"
              :imported="imported"
              @add="add"
              @more="inspect(selected.input, selected.personal, preview!.nextPageToken)"
            />
          </li>
        </ul>
        <button v-if="nextListPage" :disabled="busy" @click="loadMine(true)">Mais playlists</button>
      </template>
      <template v-else-if="status?.oauthConfigured">
        <p>
          Autorize apenas a leitura da sua conta. A conexão dura até 8 horas neste navegador e pode
          ser encerrada a qualquer momento.
        </p>
        <button v-if="status.connectHere" :disabled="busy" @click="connect">
          <AppIcon name="link" /> Conectar YouTube
        </button>
        <p v-else class="notice">
          <template v-if="remoteConnect"
            >Para conectar, entre na festa pelo endereço seguro
            <a :href="status.connectOrigin + '/'" target="_blank" rel="noopener">{{
              status.connectOrigin
            }}</a
            >.
          </template>
          <template v-else
            >O login Google pelo celular precisa de um endereço HTTPS da festa. O acesso local atual
            só permite conectar a conta no computador do servidor. O anfitrião pode publicar esse
            endereço seguindo o plano do README.</template
          >
          Enquanto isso, use Colar link para playlists públicas ou não listadas.
        </p>
      </template>
      <div v-else-if="status" class="notice">
        <strong>Conecte suas playlists pessoais</strong>
        <p>
          Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no .env com uma credencial OAuth do
          Google. O README contém o passo a passo. Enquanto isso, use Colar link.
        </p>
      </div>
    </div>
    <label class="playlist-karaoke"
      ><input v-model="karaoke" type="checkbox" :disabled="busy" /> Estas faixas são de
      karaokê</label
    >
    <p class="hint">A opção ativa o layout de karaokê. Ela não remove a voz dos vídeos.</p>
    <KaraokePartners v-if="karaoke" v-model="singers" :disabled="busy" />
    <p v-if="busy" role="status" class="hint">Carregando playlist…</p>
    <p v-if="failure" class="notice" role="alert">{{ failure }}</p>
    <p v-if="notice" class="playlist-success" role="status">
      <AppIcon name="check" /> {{ notice }}
    </p>
    <PlaylistPreviewCard
      v-if="preview && !selected.personal"
      :preview="preview"
      :busy="busy"
      :imported="imported"
      @add="add"
      @more="inspect(selected.input, selected.personal, preview!.nextPageToken)"
    />
  </section>
</template>
<style scoped>
.playlist-result-actions {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.account-playlists .playlist-result-actions > button:first-child {
  flex: 1;
  min-width: 0;
}
.account-playlists .playlist-result-actions > .add-all-playlist {
  width: auto;
  flex-shrink: 0;
  min-width: 44px;
  justify-content: center;
}
.account-playlists button[aria-expanded='true'] > .app-icon:last-child {
  transform: rotate(180deg);
}

.youtube-playlists {
  margin-top: 20px;
  min-width: 0;
}
.youtube-playlists h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.youtube-playlists button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.youtube-playlists p,
.youtube-playlists strong {
  overflow-wrap: anywhere;
}
.playlist-tabs,
.playlist-actions,
.playlist-account-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 18px 0;
}
.playlist-tabs button {
  flex: 1;
}
.playlist-tabs button[aria-pressed='true'] {
  color: var(--text);
}
.playlist-link {
  display: grid;
  gap: 9px;
}
.playlist-input-row {
  display: flex;
  gap: 8px;
}
.playlist-input-row input {
  width: 100%;
  min-width: 0;
  flex: 1;
}
.playlist-account {
  display: grid;
  gap: 12px;
}
.playlist-account-bar {
  margin: 0;
  justify-content: space-between;
}
.playlist-account a {
  text-decoration: underline;
  overflow-wrap: anywhere;
}
.account-playlists {
  padding: 0;
  margin: 0;
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
}
.account-playlists li + li {
  margin-top: 7px;
}
.account-playlists button {
  width: 100%;
  text-align: left;
  justify-content: flex-start;
}
.account-playlists img {
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 5px;
}
.account-playlists span {
  flex: 1;
  min-width: 0;
}
.account-playlists strong,
.account-playlists small {
  display: block;
}
.playlist-karaoke {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  cursor: pointer;
}
.playlist-karaoke input {
  width: 20px;
  min-height: 20px;
  accent-color: var(--accent);
}
.playlist-preview {
  border-top: 1px solid var(--line);
  margin-top: 20px;
  padding-top: 20px;
}
.playlist-tracks {
  max-height: 240px;
  overflow: auto;
  padding-left: 25px;
  margin: 12px 0;
}
.playlist-tracks li {
  padding: 7px 5px;
  border-bottom: 1px solid var(--line);
}
.playlist-tracks small {
  display: block;
}
.playlist-add {
  background: var(--accent);
  color: var(--on-accent);
}
.playlist-add:hover:not(:disabled) {
  background: var(--accent);
}
.playlist-success {
  padding: 12px;
  background: var(--surface-2);
  border: 1px solid var(--accent);
  border-radius: 10px;
  animation: playlist-added 0.24s ease-out;
}
@keyframes playlist-added {
  from {
    opacity: 0.4;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 600px) {
  .playlist-input-row {
    flex-wrap: wrap;
  }
  .playlist-input-row button {
    width: 100%;
  }
  .youtube-playlists .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .playlist-success {
    animation: none;
  }
}
</style>
