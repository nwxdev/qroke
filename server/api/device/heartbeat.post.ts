import { z } from 'zod'
export default defineEventHandler(async (event) => {
  requireDevice(event)
  const { info } = await readValidatedBody(
    event,
    z.object({ info: deviceInfoSchema.optional() }).parse,
  )
  const device = requireDevice(event)
  if (info)
    party()
      .db.prepare('UPDATE devices SET last_seen=?,info=? WHERE id=?')
      .run(Date.now(), storedDeviceInfo(info), device.id)
  else party().db.prepare('UPDATE devices SET last_seen=? WHERE id=?').run(Date.now(), device.id)
  return { ok: true }
})
