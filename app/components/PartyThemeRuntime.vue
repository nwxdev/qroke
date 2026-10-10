<script setup lang="ts">
import { partyTheme } from '#shared/themes'
import type { PartyInfo } from '#shared/parties'
const { id, page } = usePartyRoute()
const { state } = useParty()
const { light, syncTokens } = useTheme()
const preview = useState<import('#shared/themes').PartyTheme | null>(
  'qroke:theme-preview',
  () => null,
)
const request = useRequestFetch()
const { data } = await useAsyncData('party-theme:' + (id.value || 'public'), async () =>
  id.value
    ? request<{ party: PartyInfo }>('/api/f/' + id.value + '/party').catch(() => null)
    : null,
)
const theme = computed(() =>
  partyTheme(
    page.value === '/criar-festa'
      ? preview.value
      : id.value || ['/busca', '/host', '/player', '/qr'].includes(page.value)
        ? state.value?.theme || data.value?.party.theme
        : 'classic',
  ),
)
const activeTheme = useState<import('#shared/themes').PartyTheme>(
  'qroke:active-party-theme',
  () => 'classic',
)
watch(
  theme,
  (value) => {
    activeTheme.value = value
  },
  { immediate: true },
)
useHead(() => ({
  htmlAttrs: { 'data-party-theme': theme.value },
  meta: [
    {
      name: 'theme-color',
      content:
        theme.value === 'sonic-day'
          ? light.value
            ? '#edf5ff'
            : '#061326'
          : light.value
            ? '#f3f2ec'
            : '#101214',
    },
  ],
}))
watch(
  [theme, light],
  async () => {
    await nextTick()
    syncTokens()
  },
  { immediate: true, flush: 'post' },
)
onMounted(syncTokens)
</script>
<template><span class="party-theme-runtime" hidden aria-hidden="true" /></template>
