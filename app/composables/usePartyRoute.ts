import { partyIdFromPath, partyPage } from '#shared/parties'
export function usePartyRoute() {
  const route = useRoute()
  const id = computed(() => partyIdFromPath(route.path))
  const page = computed(() => partyPage(route.path))
  const href = (path: string) =>
    id.value && /^\/(?:busca|host|player|qr|tv|entrar|encerrada)(?:[/?#]|$)/.test(path)
      ? '/f/' + id.value + path
      : path
  const storageKey = (key: string) => (id.value ? key + ':' + id.value : key)
  return { id, page, href, storageKey }
}
export function usePartyFetch() {
  return useNuxtApp().$partyFetch
}
