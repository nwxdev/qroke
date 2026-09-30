import type { H3Event } from 'h3'
import { EncryptedStore } from '../core/shared-store'
export function partyInviteStore(event: H3Event) {
  const database = party(event)
  return new EncryptedStore<{ token: string; expires: number }>(
    database.db,
    database.scope,
    'invite',
    useRuntimeConfig().encryptionKey,
  )
}
export async function ensurePartyInvite(event: H3Event, rotate = false) {
  return party(event).currentInvite(partyInviteStore(event), rotate)
}
