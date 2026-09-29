import { rateLimit } from '../core/connections'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const { q, karaoke, source } = await getValidatedQuery(
    event,
    z.object({
      q: z.string().trim().min(2).max(120),
      karaoke: z.enum(['true', 'false']).default('false'),
      source: z.enum(['youtube', 'local']).default('youtube'),
    }).parse,
  )
  if (!(await rateLimit(useRuntimeConfig().dragonflyUrl, 'search:' + requestIp(event), 60)))
    throw createError({ statusCode: 429, statusMessage: 'Muitas buscas. Aguarde um minuto.' })
  try {
    return {
      tracks:
        source === 'local'
          ? (await library()).search(q)
          : await (await catalog(event)).search(q, karaoke === 'true'),
    }
  } catch (error) {
    throw createError({ statusCode: 503, statusMessage: (error as Error).message })
  }
})
