import { EncryptedStore } from '../core/shared-store'
export default defineEventHandler(async (event) => {
  requireOwner(event)
  await requireAdmin(event)
  const database = party(event),
    token = await database.rotateInvite()
  const store = new EncryptedStore<{ token: string; expires: number }>(
    database.db,
    database.scope,
    'invite',
    useRuntimeConfig().encryptionKey,
  )
  await store.set('current', { token, expires: Date.now() + 86400000 })
  return { ok: true }
})
