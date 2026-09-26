import { randomUUID, randomBytes } from 'node:crypto'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const { label } = await readValidatedBody(
    event,
    z.object({ label: z.string().trim().min(1).max(60) }).parse,
  )
  const id = randomUUID(),
    token = randomBytes(32).toString('hex')
  party()
    .db.prepare('DELETE FROM devices WHERE last_seen<? AND id != ?')
    .run(Date.now() - 86400000, party().state().playerId || '')
  party().db.prepare('INSERT INTO devices VALUES (?,?,?,?)').run(id, token, label, Date.now())
  return { id, token }
})
