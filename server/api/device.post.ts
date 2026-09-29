import { z } from 'zod'
import { rateLimit } from '../core/connections'
export default defineEventHandler(async (event) => {
  if (!(await rateLimit(useRuntimeConfig().dragonflyUrl, 'device:' + requestIp(event), 60)))
    throw createError({ statusCode: 429, statusMessage: 'Muitos aparelhos. Aguarde um minuto.' })
  const { label, info } = await readValidatedBody(
    event,
    z.object({ label: z.string().trim().min(1).max(60), info: deviceInfoSchema.optional() }).parse,
  )
  const device = await party(event).createDevice(
    label,
    info ? JSON.parse(storedDeviceInfo(info)) : {},
  )
  await touchPresence(party(event), 'device', device.id)
  return device
})
