import { rateLimit } from '../core/connections'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, z.object({ name: z.string().max(100) }).parse)
  const existing = await party(event).guest(getCookie(event, 'qroke_guest'))
  if (existing) return existing
  if (!(await rateLimit(useRuntimeConfig().dragonflyUrl, 'guest:' + requestIp(event), 60)))
    throw createError({ statusCode: 429, statusMessage: 'Muitas entradas. Aguarde um minuto.' })
  try {
    const { token, ...guest } = await party(event).createGuest(input.name)
    setCookie(event, 'qroke_guest', token, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 })
    await touchPresence(party(event), 'guest', guest.id)
    return guest
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
})
