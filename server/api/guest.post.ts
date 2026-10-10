import { rateLimit } from '../core/connections'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, z.object({ name: z.string().max(100) }).parse)
  const existing = await party(event).guest(partyCredential(event, 'qroke_guest'))
  if (existing) return existing
  const cache = useRuntimeConfig().dragonflyUrl
  const allowed = event.context.qrokeScoped
    ? (await rateLimit(cache, 'guest-ip:' + requestIp(event), 600)) &&
      (await rateLimit(cache, 'guest-party:' + party(event).scope, 120))
    : await rateLimit(cache, 'guest:' + requestIp(event), 60)
  if (!allowed)
    throw createError({ statusCode: 429, statusMessage: 'Muitas entradas. Aguarde um minuto.' })
  try {
    const { token, ...guest } = await party(event).createGuest(input.name)
    await setPartyCredential(event, 'qroke_guest', token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    })
    const device = await party(event).device(getHeader(event, 'x-qroke-device-key'))
    if (device) await party(event).linkDeviceGuest(device.id, guest)
    await touchPresence(party(event), 'guest', guest.id)
    return guest
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
})
