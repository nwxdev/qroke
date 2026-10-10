<script setup lang="ts">
const { fieldProps, buttonProps, toggleProps } = useThemeTokens()
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
const suggestions = ref<string[]>([])
const suggestionFocus = ref(false)
const suggestionIndex = ref(-1)
const suggestionsId = useId()
const suggestionsVisible = computed(() => suggestionFocus.value && suggestions.value.length > 0)
let suggestionTimer: ReturnType<typeof setTimeout>
let suggestionRequest = 0
let suggestionAbort: AbortController | undefined
function dismissSuggestions() {
  suggestionRequest++
  clearTimeout(suggestionTimer)
  suggestionAbort?.abort()
  suggestions.value = []
  suggestionIndex.value = -1
}
watch([query, karaoke, source, suggestionFocus], () => {
  dismissSuggestions()
  if (!suggestionFocus.value || source.value !== 'youtube' || query.value.trim().length < 2) return
  const seq = suggestionRequest
  suggestionTimer = setTimeout(async () => {
    suggestionAbort = new AbortController()
    try {
      const result = await $fetch<{ suggestions: string[] }>('/api/suggestions', {
        query: { q: query.value, karaoke: karaoke.value },
        signal: suggestionAbort.signal,
        timeout: 4000,
      })
      if (seq === suggestionRequest) suggestions.value = result.suggestions
    } catch {
      /* Suggestions are optional; Enter still performs the normal search. */
    }
  }, 350)
})
async function chooseSuggestion(value: string) {
  query.value = value
  await nextTick()
  dismissSuggestions()
  await search()
}
function searchKey(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestionsVisible.value) {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    suggestionIndex.value =
      (suggestionIndex.value + step + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Escape') {
    event.preventDefault()
    dismissSuggestions()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const value = suggestionsVisible.value ? suggestions.value[suggestionIndex.value] : undefined
    if (value) void chooseSuggestion(value)
    else void search()
  }
}
onBeforeUnmount(dismissSuggestions)
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
function clearSearch() {
  request++
  query.value = ''
  results.value = []
  searched.value = false
  searching.value = false
  searchError.value = ''
  searchInput.value?.focus()
}
async function search() {
  if (searching.value || query.value.trim().length < 2) return
  dismissSuggestions()
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
          v-bind="fieldProps"
          ref="searchInput"
          v-model="query"
          outlined
          placeholder="Música, artista ou aquele refrão…"
          aria-label="Buscar música"
          enterkeyhint="search"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="suggestionsVisible"
          :aria-controls="suggestionsId"
          :aria-activedescendant="
            suggestionIndex >= 0 && suggestionsVisible
              ? suggestionsId + '-' + suggestionIndex
              : undefined
          "
          @focus="suggestionFocus = true"
          @blur="suggestionFocus = false"
          @keydown="searchKey"
          maxlength="120"
          :autofocus="!embedded"
          ><template #prepend><AppIcon name="search" /></template></QInput
        ><button
          type="button"
          class="clear-search"
          aria-label="Limpar busca"
          :disabled="!query && !searched"
          @pointerdown.prevent
          @click="clearSearch"
        >
          <AppIcon name="close" /><span>Limpar</span></button
        ><QBtn
          v-bind="buttonProps"
          type="submit"
          color="primary"
          no-caps
          :loading="searching"
          :disable="query.trim().length < 2"
        >
          <AppIcon name="search" class="on-left" /><span>Buscar</span>
        </QBtn>
      </form>
      <ul
        v-if="suggestionsVisible"
        :id="suggestionsId"
        class="search-suggestions"
        role="listbox"
        aria-label="Sugestões de busca"
      >
        <li
          v-for="(value, index) in suggestions"
          :id="suggestionsId + '-' + index"
          :key="value"
          role="option"
          :aria-selected="suggestionIndex === index"
          @pointerdown.prevent
          @click="chooseSuggestion(value)"
        >
          <AppIcon name="search" /><span>{{ value }}</span>
          <small v-if="karaoke">Karaokê</small>
        </li>
      </ul>
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
          v-bind="toggleProps"
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
.search-suggestions {
  list-style: none;
  padding: 6px;
  margin: 8px 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}
.search-suggestions li {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  min-height: 44px;
  cursor: pointer;
  border-radius: 8px;
  overflow-wrap: anywhere;
}
.search-suggestions li[aria-selected='true'],
.search-suggestions li:hover {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}
.search-suggestions span {
  flex: 1;
}
.music-search {
  min-width: 0;
}
.search-section {
  scroll-margin-top: 100px;
}
.clear-search {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 10px;
}
@media (max-width: 500px) {
  .search-form {
    flex-wrap: wrap;
  }
  .search-form > .q-field {
    flex: 1 1 calc(100% - 62px);
  }
  .clear-search {
    width: 48px;
  }
  .clear-search span {
    display: none;
  }
}
</style>
