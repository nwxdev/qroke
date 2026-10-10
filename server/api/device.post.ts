import { z } from 'zod'
import { rateLimit } from '../core/connections'
export default defineEventHandler(async (event) => {
  if (!(await rateLimit(useRuntimeConfig().dragonflyUrl, 'device:' + requestIp(event), 60)))
    throw createError({ statusCode: 429, statusMessage: 'Muitos aparelhos. Aguarde um minuto.' })
  const { label, info } = await readValidatedBody(
    event,
    z.object({ label: z.string().trim().min(1).max(60), info: deviceInfoSchema.optional() }).parse,
  )
  const guest = await party(event).guest(partyCredential(event, 'qroke_guest'))
  const device = await party(event).createDevice(
    label,
    info ? JSON.parse(storedDeviceInfo(info)) : {},
    {
      guestId: guest?.id,
      guestName: guest?.name,
      membershipId: event.context.qrokeMembership?._id,
      owner: (await partyRole(event)) === 'owner',
    },
  )
  await touchPresence(party(event), 'device', device.id)
  return device
})
