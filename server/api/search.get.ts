import { z } from 'zod'
const limits = new Map<string, { count: number; until: number }>()
export default defineEventHandler(async (event) => {
  const { q, karaoke, source } = await getValidatedQuery(
    event,
    z.object({
      q: z.string().trim().min(2).max(120),
      karaoke: z.enum(['true', 'false']).default('false'),
      source: z.enum(['youtube', 'local']).default('youtube'),
    }).parse,
  )
  const ip = getRequestIP(event) || 'unknown',
    now = Date.now()
  for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
  const limit = limits.get(ip) || { count: 0, until: now + 60000 }
  if (++limit.count > 60)
    throw createError({ statusCode: 429, statusMessage: 'Muitas buscas. Aguarde um minuto.' })
  limits.set(ip, limit)
  try {
    return {
      tracks:
        source === 'local'
          ? (await library()).search(q)
          : await catalog().search(q, karaoke === 'true'),
    }
  } catch (error) {
    throw createError({ statusCode: 503, statusMessage: (error as Error).message })
  }
})
