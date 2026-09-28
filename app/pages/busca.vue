<script setup lang="ts">
import type { Track } from '../../shared/types'
const { state, guest, queue, pending, act, api, add, isPlayer } = useParty()
const route = useRoute()
async function focusSearchTarget() {
  if (!import.meta.client || route.hash !== '#busca') return
  await nextTick()
  const target = document.getElementById('busca')
  target?.scrollIntoView({ block: 'start' })
  target?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
}
onMounted(focusSearchTarget)
watch([() => route.hash, () => !!guest.value], focusSearchTarget, { flush: 'post' })
const name = ref(''),
  query = ref(''),
  karaoke = ref(false),
  source = ref<'youtube' | 'local'>('youtube'),
  results = ref<Track[]>([]),
  searching = ref(false),
  searched = ref(false),
  searchError = ref(''),
  addedId = ref('')
const singers = ref<string[]>([])
let feedbackTimer: ReturnType<typeof setTimeout>
async function requestAdd(track: Track) {
  await add(track, track.karaoke ? singers.value : [])
  if (alreadyQueued(track)) {
    addedId.value = track.source + track.id
    clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => {
      addedId.value = ''
    }, 1200)
  }
}
onBeforeUnmount(() => clearTimeout(feedbackTimer))
const searchInput = ref<{ focus: () => void } | null>(null)
let request = 0
const nameError = computed(() => {
  const n = name.value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()
  return Array.from(n).length >= 2 && Array.from(n).length <= 20 ? '' : 'Use de 2 a 20 caracteres.'
})
async function join() {
  if (nameError.value) return
  await act(() => api('/api/guest', { name: name.value }))
  await nextTick()
  searchInput.value?.focus()
}
async function search() {
  if (searching.value || query.value.trim().length < 2) return
  const seq = ++request
  searching.value = true
  searchError.value = ''
  searched.value = true
  try {
    const result = await $fetch<{ tracks: Track[] }>('/api/search', {
      query: { q: query.value, karaoke: karaoke.value, source: source.value },
    })
    if (seq === request) results.value = result.tracks
  } catch (error) {
    if (seq === request) {
      results.value = []
      searchError.value = errorText(error)
    }
  } finally {
    if (seq === request) searching.value = false
  }
}
watch([karaoke, source], () => {
  request++
  results.value = []
  searched.value = false
  searching.value = false
})
function queuedLabel(track: Track) {
  if (state.value?.current?.id === track.id && state.value.current.source === track.source)
    return 'Tocando agora'
  const index = queue.value.findIndex(
    (item) => item.id === track.id && item.source === track.source,
  )
  return index < 0 ? '' : 'Na fila · #' + (index + 1)
}
const alreadyQueued = (track: Track) => !!queuedLabel(track)
</script>
<template>
  <div class="page-shell">
    <BrandHeader
      ><NuxtLink to="/host" class="header-control"
        ><AppIcon name="person" /> Anfitrião</NuxtLink
      ></BrandHeader
    ><PartyNotice />
    <GuestIdentity />
    <QueueCarousel />
    <main class="guest-layout">
      <section class="discovery">
        <div class="hero">
          <span class="eyebrow"><span class="live-dot" /> A PLAYLIST É NOSSA</span>
          <h1>Sua vez de<br />dar o <em>play.</em></h1>
          <p>Um hit esquecido. Um refrão impossível.<br />Escolha o próximo momento da festa.</p>
        </div>
        <section v-if="!guest" id="busca" class="join-card panel">
          <h2>Como podemos te chamar?</h2>
          <p>Seu nome aparece na fila. Só precisa dizer uma vez.</p>
          <form @submit.prevent="join">
            <QInput
              v-model="name"
              outlined
              label="Seu nome"
              maxlength="24"
              autocomplete="nickname"
              autofocus
              :disable="pending"
            /><small v-if="name && nameError">{{ nameError }}</small
            ><QBtn
              type="submit"
              color="primary"
              no-caps
              label="Entrar na festa →"
              :loading="pending"
              :disable="!!nameError"
            />
          </form>
        </section>
        <section v-else id="busca" class="search-section">
          <div class="section-heading">
            <h2>Oi, {{ guest.name }} <span>✦</span></h2>
            <span>O que vamos ouvir?</span>
          </div>
          <form class="search-form" @submit.prevent="search">
            <QInput
              ref="searchInput"
              v-model="query"
              outlined
              placeholder="Música, artista ou aquele refrão…"
              aria-label="Buscar música"
              enterkeyhint="search"
              @keydown.enter.prevent="search"
              maxlength="120"
              autofocus
              :disable="searching"
              ><template #prepend><AppIcon name="search" /></template></QInput
            ><QBtn
              type="submit"
              color="primary"
              no-caps
              label="Buscar"
              icon="search"
              :loading="searching"
              :disable="query.trim().length < 2"
            />
          </form>
          <span class="sr-only" role="status">{{
            addedId ? 'Música adicionada à fila.' : ''
          }}</span>
          <div class="search-options">
            <div class="segmented">
              <button :aria-pressed="source === 'youtube'" @click="source = 'youtube'">
                YouTube</button
              ><button :aria-pressed="source === 'local'" @click="source = 'local'">
                Biblioteca local
              </button>
            </div>
            <QToggle
              v-if="source === 'youtube'"
              v-model="karaoke"
              color="primary"
              label="Karaokê"
            />
          </div>
          <KaraokePartners
            v-if="karaoke && source === 'youtube'"
            v-model="singers"
            :disabled="pending"
          />
          <p v-if="karaoke && source === 'youtube'" class="hint">
            Microfone imaginário, voz de verdade. Escolha um vídeo com letra.
          </p>
          <p v-if="searchError" role="alert" class="notice error">{{ searchError }}</p>
          <div v-if="searching" class="search-status" role="status">Procurando o próximo hit…</div>
          <div v-else-if="searched && !results.length && !searchError" class="empty-queue">
            <span>⌕</span>
            <h3>Nada por aqui ainda</h3>
            <p>Tente outro nome de música ou artista.</p>
          </div>
          <ul v-else-if="results.length" class="results">
            <li v-for="track in results" :key="track.source + track.id">
              <img
                v-if="track.thumbnail"
                :src="track.thumbnail"
                alt=""
                referrerpolicy="no-referrer"
              /><span v-else class="track-art">♫</span>
              <div class="track-info">
                <strong>{{ track.title }}</strong
                ><small
                  >{{ track.artist }} <span v-if="track.karaoke" class="tag">Karaokê</span></small
                >
                <span v-if="queuedLabel(track)" class="tag queued-label">{{
                  queuedLabel(track)
                }}</span>
              </div>
              <button
                class="add-button"
                :class="{ 'just-added': addedId === track.source + track.id }"
                :disabled="pending || alreadyQueued(track)"
                :aria-label="'Adicionar ' + track.title + ' à fila'"
                @click="requestAdd(track)"
              >
                <AppIcon :name="alreadyQueued(track) ? 'check' : 'plus'" />
              </button>
            </li>
          </ul>
          <div v-else class="discovery-note">
            <span>↗</span>
            <p>
              <strong>Todo mundo tem sua vez.</strong><br />A fila intercala os pedidos de cada
              pessoa. Pode escolher mais de uma.
            </p>
          </div>
        </section>
        <YoutubePlaylists v-if="guest" />
      </section>
      <aside class="party-sidebar">
        <div class="section-heading">
          <h2>Na festa</h2>
          <span class="count-badge">{{ queue.length }} na fila</span>
        </div>
        <div class="now-playing panel">
          <span class="eyebrow"
            ><span class="equalizer">▂▆▃</span>
            {{
              !state?.playerId
                ? 'AGUARDANDO O ANFITRIÃO'
                : state?.current
                  ? 'TOCANDO AGORA'
                  : 'PRONTOS PARA COMEÇAR'
            }}</span
          >
          <h3>
            {{
              state?.current?.title ||
              (state?.playerId ? 'O primeiro play é com você' : 'Falta ativar o som')
            }}
          </h3>
          <p>
            {{
              state?.current?.artist ||
              (state?.playerId
                ? 'Escolha uma música para abrir a noite.'
                : 'O anfitrião precisa escolher onde a festa vai tocar.')
            }}
          </p>
          <small v-if="state?.current">Pedido de {{ state.current.guestName }}</small>
          <PlaylistBadge :playlist="state?.current?.playlist" />
        </div>
        <PartyPeople />
        <MediaPlayer v-if="isPlayer" />
        <div class="sidebar-footer">
          Uma festa, muitas vozes.<br /><NuxtLink to="/player">Abrir player ↗</NuxtLink>
        </div>
      </aside>
    </main>
    <footer class="site-footer">
      <span>QRokê · Feito para cantar junto.</span
      ><NuxtLink to="/player">Player e convite QR ↗</NuxtLink>
    </footer>
  </div>
</template>
