import type { H3Event } from 'h3'
import { EncryptedStore } from '../core/shared-store'
export type OAuthRoute = {
  organizationId: string
  partyId: string
  browserHash: string
  binding: string
  expires: number
}
export function oauthRoutes(event: H3Event) {
  return new EncryptedStore<OAuthRoute>(
    party(event).db,
    'oauth-routing',
    'route',
    useRuntimeConfig().encryptionKey,
  )
}
