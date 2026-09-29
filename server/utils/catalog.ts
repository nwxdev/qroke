import { Catalog, musicProvider } from '../core/catalog'
import { Library } from '../core/library'
let catalogInstance: Catalog | undefined
let libraryInstance: Promise<Library> | undefined
export function catalog() {
  const config = useRuntimeConfig()
  return (catalogInstance ||= new Catalog(
    musicProvider(config.youtubeRegion),
    config.youtubeApiKey,
    () => party().consumeQuota(config.quotaDailyCap),
    publishWarning,
    undefined,
    { region: config.youtubeRegion, unavailable: (id) => party().youtubeBlocked(id) },
  ))
}
export function library() {
  return (libraryInstance ||= (async () => {
    const lib = new Library(useRuntimeConfig().musicDir)
    try {
      await lib.scan()
    } catch {
      publishWarning('Não foi possível indexar QROKE_MUSIC_DIR. Confira o caminho e as permissões.')
    }
    return lib
  })())
}
