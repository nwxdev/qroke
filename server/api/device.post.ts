import { randomUUID, randomBytes } from 'node:crypto'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const { label, info } = await readValidatedBody(
    event,
    z.object({ label: z.string().trim().min(1).max(60), info: deviceInfoSchema.optional() }).parse,
  )
  const id = randomUUID(),
    token = randomBytes(32).toString('hex')
  party()
    .db.prepare('DELETE FROM devices WHERE last_seen<? AND id != ?')
    .run(Date.now() - 86400000, party().state().playerId || '')
  party()
    .db.prepare('INSERT INTO devices (id,token,label,last_seen,info) VALUES (?,?,?,?,?)')
    .run(id, token, label, Date.now(), info ? storedDeviceInfo(info) : '{}')
  return { id, token }
})
