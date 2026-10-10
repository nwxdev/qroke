import { createHash } from 'node:crypto'
import { z } from 'zod'
import { dragonflyConnection, rateLimit } from '../core/connections'
import { musicProvider } from '../core/catalog'
import { suggestionQuery, cleanSuggestions } from '../core/search-suggestions'
const providers = new Map<string, ReturnType<typeof musicProvider>>()
const pending = new Map<string, Promise<string[]>>()
export default defineEventHandler(async (event) => {
  const { q, karaoke } = await getValidatedQuery(
    event,
    z.object({
      q: z.string().trim().min(2).max(120),
      karaoke: z.enum(['true', 'false']).default('false'),
    }).parse,
  )
  const config = useRuntimeConfig()
  if (
    !(await rateLimit(config.dragonflyUrl, 'suggest-ip:' + requestIp(event), 120)) ||
    !(await rateLimit(config.dragonflyUrl, 'suggest-party:' + party(event).scope, 240))
  )
    return { suggestions: [] }
  const isKaraoke = karaoke === 'true'
  const query = suggestionQuery(q, isKaraoke)
  const redis = await dragonflyConnection(config.dragonflyUrl)
  const key =
    'qroke:suggestions:' +
    config.mongodbDatabase +
    ':' +
    config.youtubeRegion +
    ':' +
    createHash('sha256').update(query).digest('hex')
  const cached = await redis.get(key)
  if (cached) return { suggestions: cleanSuggestions(JSON.parse(cached), q, isKaraoke) }
  if (!pending.has(key)) {
    const task = (async () => {
      // One provider call per prefix across replicas; suggestions never use videos.list/search.list quota.
      if (!(await redis.set(key + ':lock', '1', { NX: true, EX: 5 }))) return []
      if (!(await rateLimit(config.dragonflyUrl, 'suggest-provider', 600))) return []
      let provider = providers.get(config.youtubeRegion)
      if (!provider) {
        provider = musicProvider(config.youtubeRegion)
        providers.set(config.youtubeRegion, provider)
      }
      try {
        const values = await provider.suggestions!(query)
        await redis.set(key, JSON.stringify(values.slice(0, 12)), { EX: 300 })
        return values
      } catch {
        await redis.set(key, '[]', { EX: 30 })
        return []
      }
    })().finally(() => pending.delete(key))
    pending.set(key, task)
  }
  return { suggestions: cleanSuggestions(await pending.get(key)!, q, isKaraoke) }
})
