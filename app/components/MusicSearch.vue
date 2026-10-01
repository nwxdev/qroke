<script setup lang="ts">
const $fetch = usePartyFetch()
import type { Track } from '#shared/types'
import { MEDIA_PROVIDER_INFO, type MediaProviderId } from '#shared/media'
const providers = MEDIA_PROVIDER_INFO.filter((item) => item.enabled && item.capabilities.search)
const props = withDefaults(defineProps<{ allowKaraoke?: boolean; embedded?: boolean }>(), {
  allowKaraoke: true,
  embedded: false,
})
const { state, guest, queue, pending, act, api, add, isPlayer } = useParty()
const route = useRoute()
const { feedback } = usePartyMotion()
async function focusSearchTarget() {
  if (!import.meta.client || route.hash !== '#busca') return
  await nextTick()
  const target = document.getElementById('busca')
  target?.scrollIntoView({ block: 'start' })
  target?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
}
onMounted(focusSearchTarget)
watch([() => route.hash, () => !!guest.value], focusSearchTarget, { flush: 'post' })
const query = ref(''),
  karaoke = ref(props.allowKaraoke && route.query.karaoke === '1'),
  source = ref<MediaProviderId>('youtube'),
  results = ref<Track[]>([]),
  searching = ref(false),
  searched = ref(false),
  searchError = ref(''),
  addedId = ref('')
const singers = ref<string[]>([])
let feedbackTimer: ReturnType<typeof setTimeout>
async function requestAdd(track: Track) {
  const accepted = await add(track, track.karaoke ? singers.value : [])
  if (accepted) {
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
async function search() {
  if (searching.value || query.value.trim().length < 2) return
  const seq = ++request
  searching.value = true
  searchError.value = ''
  searched.value = true
  try {
    const result = await $fetch<{ tracks: Track[] }>('/api/media/' + source.value + '/search', {
      query: {
        q: query.value,
        karaoke: karaoke.value,
        channel: karaoke.value ? 'karaoke' : state.value?.mode || 'music',
      },
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
  <div class="music-search">
    <GuestJoin v-if="!guest" :autofocus="!embedded" />
    <MotionReveal v-if="guest" as="section" id="busca" class="search-section">
      <div class="section-heading">
        <h2>Buscar música</h2>
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
          :autofocus="!embedded"
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
      <span class="sr-only" role="status">{{ addedId ? 'Música adicionada à fila.' : '' }}</span>
      <div class="search-options">
        <div class="segmented">
          <button
            v-for="provider in providers"
            :key="provider.id"
            :aria-pressed="source === provider.id"
            @click="source = provider.id"
          >
            {{ provider.name }}
          </button>
        </div>
        <QToggle
          v-if="allowKaraoke && source === 'youtube'"
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
      <div v-if="searchError" role="alert" class="notice error">
        <p>{{ searchError }}</p>
        <button type="button" :disabled="searching || query.trim().length < 2" @click="search">
          <AppIcon name="refresh" /> Tentar busca novamente
        </button>
      </div>
      <div v-if="searching" class="search-status" role="status">Buscando…</div>
      <div v-else-if="searched && !results.length && !searchError" class="empty-queue">
        <span>⌕</span>
        <h3>Nada por aqui ainda</h3>
        <p>Tente outro nome de música ou artista.</p>
      </div>
      <MotionList v-else-if="results.length" tag="ul" class="results" appear>
        <li
          v-for="(track, index) in results"
          :key="track.source + track.id"
          :style="{ '--result-delay': Math.min(index, 5) * 35 + 'ms' }"
        >
          <img
            v-if="track.thumbnail"
            :src="track.thumbnail"
            alt=""
            referrerpolicy="no-referrer"
          /><span v-else class="track-art">♫</span>
          <div class="track-info">
            <strong>{{ track.title }}</strong
            ><small>{{ track.artist }} <span v-if="track.karaoke" class="tag">Karaokê</span></small>
            <span v-if="queuedLabel(track)" class="tag queued-label">{{ queuedLabel(track) }}</span>
          </div>
          <button
            class="add-button"
            :class="{ 'just-added': addedId === track.source + track.id }"
            :disabled="pending || alreadyQueued(track)"
            :aria-label="'Adicionar ' + track.title + ' à fila'"
            @click="requestAdd(track)"
          >
            <MotionCue
              :trigger="
                feedback?.target === 'track:' + track.source + ':' + track.id ? feedback.id : 0
              "
              kind="add"
            >
              <AppIcon
                :name="
                  alreadyQueued(track) || addedId === track.source + track.id ? 'check' : 'plus'
                "
              />
            </MotionCue>
          </button>
        </li>
      </MotionList>
    </MotionReveal>
    <YoutubePlaylists v-if="guest" :allow-karaoke="allowKaraoke" />
  </div>
</template>
<style scoped>
.music-search {
  min-width: 0;
}
.search-section {
  scroll-margin-top: 100px;
}
</style>
