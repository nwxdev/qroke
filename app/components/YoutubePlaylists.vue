<script setup lang="ts">
const $fetch = usePartyFetch()
withDefaults(defineProps<{ allowKaraoke?: boolean }>(), { allowKaraoke: true })
const googleVersion = useState('qroke:google-version', () => 0)
const googleFailure = useState('qroke:google-failure', () => '')
const nuxt = useNuxtApp()
import type { PlaylistPreview, YoutubePlaylist, YoutubeStatus } from '../../shared/playlists'
const { refresh, session, state, queue } = useParty()
const { celebrate } = usePartyMotion()
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
  status.value = await $fetch<YoutubeStatus>('/api/media/youtube/status', {
    signal: controller?.signal,
  })
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
      '/api/media/youtube/playlists',
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
    preview.value = await $fetch<PlaylistPreview>('/api/media/youtube/preview', {
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
    const result = await $fetch<{ added: number; duplicates: number }>(
      '/api/media/youtube/import',
      {
        method: 'POST',
        body: { ticket: preview.value!.ticket, singers: singers.value, videoId },
        signal: controller?.signal,
      },
    )
    if (result.added > 0)
      celebrate({
        kind: videoId ? 'add' : 'playlist',
        message:
          result.added === 1
            ? 'Mais uma para a festa!'
            : result.added + ' músicas! A trilha da festa ganhou força.',
        target: videoId ? 'track:youtube:' + videoId : 'playlist:' + preview.value!.playlist.id,
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
  await nuxt.$connectGoogle()
}
async function disconnect() {
  await task(async () => {
    await $fetch('/api/media/youtube/disconnect', { method: 'POST', body: {} })
    playlists.value = []
    preview.value = null
    await loadStatus()
    notice.value =
      'Conta desconectada deste navegador. As músicas já adicionadas continuam na fila.'
  })
}
async function connectedPlaylists() {
  await task(loadStatus)
  if (status.value?.connected) {
    source.value = 'mine'
    await loadMine()
  }
}
watch(googleVersion, connectedPlaylists)
watch(karaoke, () => {
  preview.value = null
})
onMounted(() => {
  void connectedPlaylists()
})
onBeforeUnmount(() => {
  controller?.abort()
})
</script>
<template>
  <MotionReveal
    as="section"
    class="panel youtube-playlists"
    :delay="100"
    aria-labelledby="playlists-title"
    :aria-busy="busy"
  >
    <div class="section-heading">
      <h2 id="playlists-title"><AppIcon name="playlist" /> Playlists do YouTube</h2>
    </div>
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
      <small>Playlists públicas ou não listadas.</small>
      <p v-if="status && !status.publicConfigured" class="notice">
        Playlists por link estão indisponíveis no momento.
      </p>
    </form>
    <div v-else class="playlist-account">
      <template v-if="status?.connected">
        <div class="playlist-account-bar">
          <span><AppIcon name="check" /> Conta conectada neste navegador</span>
          <button :disabled="busy" @click="disconnect">Desconectar</button>
        </div>
        <p class="hint">Sua conta é privada. As músicas adicionadas aparecem na festa.</p>
        <button :disabled="busy" @click="loadMine()">Atualizar playlists</button>
        <ul v-if="playlists.length" class="account-playlists">
          <li v-for="item in playlists" :key="item.id">
            <div class="playlist-result-actions">
              <button
                :disabled="busy"
                :aria-expanded="preview?.playlist.id === item.id && selected.personal"
                @click="expand(item)"
              >
                <span class="playlist-art">
                  <img
                    v-if="item.thumbnail"
                    :src="item.thumbnail"
                    alt=""
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <span v-if="playlistQueued(item.id)" class="tag">Na fila</span>
                </span>
                <span
                  ><strong>{{ item.title }}</strong
                  ><small>{{ item.channel }} · {{ item.count }} faixas</small></span
                >
                <AppIcon name="expand" />
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
            <button
              class="add-all-playlist"
              :disabled="busy"
              :aria-label="'Adicionar todas de ' + item.title"
              title="Adicionar todas, sem duplicar faixas"
              @click="addAll(item)"
            >
              <AppIcon name="playlist-plus" /> Adicionar playlist
            </button>
          </li>
        </ul>
        <button v-if="nextListPage" :disabled="busy" @click="loadMine(true)">Mais playlists</button>
      </template>
      <template v-else-if="status?.oauthConfigured">
        <p>Conecte o Google para escolher suas playlists.</p>
        <button v-if="status.connectHere" :disabled="busy" @click="connect">
          <AppIcon name="link" /> Conectar Google
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
      <p v-else-if="status" class="notice">Google indisponível. Use o link da playlist.</p>
    </div>
    <label v-if="allowKaraoke" class="playlist-karaoke"
      ><input v-model="karaoke" type="checkbox" :disabled="busy" /> Estas faixas são de
      karaokê</label
    >

    <KaraokePartners v-if="karaoke" v-model="singers" :disabled="busy" />
    <p v-if="busy" role="status" class="hint">Carregando playlist…</p>
    <p v-if="failure || googleFailure" class="notice" role="alert">
      {{ failure || googleFailure }}
    </p>
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
  </MotionReveal>
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

.playlist-art {
  display: grid;
  gap: 5px;
  flex: 0 0 64px !important;
  justify-items: center;
}
.playlist-art .tag {
  font-size: 10px;
  padding: 2px 5px;
  white-space: nowrap;
}
.account-playlists .add-all-playlist {
  width: 100%;
  justify-content: center;
  margin-top: 8px;
}
.account-playlists li {
  padding: 10px 0;
}
@media (max-width: 600px) {
  .account-playlists {
    max-height: none;
    overflow: visible;
  }
  .account-playlists img {
    width: 64px;
    height: 48px;
  }
}
</style>
