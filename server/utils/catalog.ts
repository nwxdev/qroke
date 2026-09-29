import type { H3Event } from 'h3'
import { createHash } from 'node:crypto'
import { Catalog, musicProvider } from '../core/catalog'
import { Library } from '../core/library'
import { dragonflyConnection } from '../core/connections'
import type { Track } from '../../shared/types'
let libraryInstance: Promise<Library> | undefined
const provider = musicProvider()
export async function catalog(event: H3Event) {
  if (event.context.qrokeCatalog)
    return event.context.qrokeCatalog as Awaited<ReturnType<typeof createCatalog>>
  return (event.context.qrokeCatalog = await createCatalog(event))
}
async function createCatalog(event: H3Event) {
  const config = useRuntimeConfig(),
    database = party(event)
  const blocked = await database.blockedIds(),
    redis = await dragonflyConnection(config.dragonflyUrl)
  const core = new Catalog(
    provider,
    config.youtubeApiKey,
    () => database.consumeQuota(config.quotaDailyCap),
    (warning) => {
      void publishWarning(database, warning).catch(() => {})
    },
    undefined,
    { region: config.youtubeRegion, unavailable: (id) => blocked.has(id) },
  )
  const prefix =
    'qroke:catalog:' +
    config.mongodbDatabase +
    ':' +
    database.scope +
    ':' +
    config.youtubeRegion +
    ':'
  async function remember(tracks: Track[]) {
    const accepted = tracks.filter((track) => !blocked.has(track.id))
    await Promise.all(
      accepted.map((track) =>
        redis.set(prefix + 'track:' + track.id + ':' + track.karaoke, JSON.stringify(track), {
          EX: 3600,
        }),
      ),
    )
    return accepted
  }
  return {
    async selected(id: string, karaoke: boolean) {
      if (blocked.has(id)) return undefined
      const value = await redis.get(prefix + 'track:' + id + ':' + karaoke)
      return value ? (JSON.parse(value) as Track) : undefined
    },
    async search(query: string, karaoke = false) {
      const key =
        prefix +
        'search:' +
        createHash('sha256')
          .update(query.trim().toLowerCase() + ':' + karaoke)
          .digest('hex')
      const cached = await redis.get(key)
      if (cached) return remember(JSON.parse(cached) as Track[])
      const tracks = await remember(await core.search(query, karaoke))
      await redis.set(key, JSON.stringify(tracks), { EX: 300 })
      return tracks
    },
    async related(id: string, karaoke = false) {
      return remember(await core.related(id, karaoke))
    },
  }
}
export function library() {
  return (libraryInstance ||= (async () => {
    const lib = new Library(useRuntimeConfig().musicDir)
    await lib.scan()
    return lib
  })())
}
