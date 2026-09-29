import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  const { info } = await readValidatedBody(
    event,
    z.object({ info: deviceInfoSchema.optional() }).parse,
  )
  await party(event).touchDevice(device.id, info ? JSON.parse(storedDeviceInfo(info)) : undefined)
  await touchPresence(party(event), 'device', device.id)
  return { ok: true }
})
