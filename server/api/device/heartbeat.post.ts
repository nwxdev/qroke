import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  const { info } = await readValidatedBody(
    event,
    z.object({ info: deviceInfoSchema.optional() }).parse,
  )
  await party(event).touchDevice(device.id, info ? JSON.parse(storedDeviceInfo(info)) : undefined)
  const guest = await party(event).guest(partyCredential(event, 'qroke_guest'))
  if (guest) await party(event).linkDeviceGuest(device.id, guest)
  await touchPresence(party(event), 'device', device.id)
  return { ok: true }
})
