import { rateLimit } from '../core/connections'
import { z } from 'zod'
import { MEDIA_PROVIDERS, MEDIA_CHANNELS } from '../../shared/media'
export default defineEventHandler(async (event) => {
  const { q, karaoke, source, channel } = await getValidatedQuery(
    event,
    z.object({
      q: z.string().trim().min(2).max(120),
      karaoke: z.enum(['true', 'false']).default('false'),
      source: z.enum(MEDIA_PROVIDERS).default('youtube'),
      channel: z.enum(MEDIA_CHANNELS).optional(),
    }).parse,
  )
  if (
    !(await rateLimit(useRuntimeConfig().dragonflyUrl, 'search:' + requestIp(event), 120)) ||
    !(await rateLimit(useRuntimeConfig().dragonflyUrl, 'search-party:' + party(event).scope, 120))
  )
    throw createError({ statusCode: 429, statusMessage: 'Muitas buscas. Aguarde um minuto.' })
  const providerId = z.enum(MEDIA_PROVIDERS).safeParse(getRouterParam(event, 'provider') || source)
  if (!providerId.success)
    throw createError({ statusCode: 400, statusMessage: 'Plataforma inválida.' })
  const adapter = mediaProvider(event, providerId.data)
  try {
    return {
      tracks: await adapter.search(q, channel || (karaoke === 'true' ? 'karaoke' : 'music')),
    }
  } catch (error) {
    throw createError({ statusCode: 503, statusMessage: (error as Error).message })
  }
})
