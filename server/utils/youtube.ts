import type { H3Event } from 'h3'
import {
  YoutubePlaylists,
  PlaylistError,
  type Pending,
  type Account,
  type Ticket,
} from '../core/youtube-playlists'
import { EncryptedStore } from '../core/shared-store'
export async function youtube(event: H3Event): Promise<YoutubePlaylists> {
  if (event.context.qrokeYoutube) return event.context.qrokeYoutube
  const c = useRuntimeConfig(),
    database = party(event),
    blocked = await database.blockedIds()
  const service = new YoutubePlaylists(
    {
      key: c.youtubeApiKey,
      region: c.youtubeRegion,
      clientId: c.youtubeClientId,
      clientSecret: c.youtubeClientSecret,
      redirect: c.youtubeRedirectUri,
    },
    undefined,
    undefined,
    (id) => blocked.has(id),
    {
      pending: new EncryptedStore<Pending>(database.db, database.scope, 'pending', c.encryptionKey),
      accounts: new EncryptedStore<Account>(
        database.db,
        database.scope,
        'account',
        c.encryptionKey,
      ),
      tickets: new EncryptedStore<Ticket>(database.db, database.scope, 'ticket', c.encryptionKey),
    },
  )
  event.context.qrokeYoutube = service
  return service
}
export async function youtubeAccount(event: H3Event) {
  return (await youtube(event)).ownedAccount(
    getCookie(event, 'qroke_youtube'),
    (await playlistAccess(event)).owner,
  )
}
export async function youtubeResult<T>(action: () => Promise<T> | T): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof PlaylistError)
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    throw createError({ statusCode: 502, statusMessage: 'Não foi possível carregar o YouTube.' })
  }
}
