import type { H3Event } from 'h3'
import { YoutubePlaylists, PlaylistError } from '../core/youtube-playlists'
let service: YoutubePlaylists | undefined
export function youtube() {
  const c = useRuntimeConfig()
  return (service ||= new YoutubePlaylists({
    key: c.youtubeApiKey,
    clientId: c.youtubeClientId,
    clientSecret: c.youtubeClientSecret,
    redirect: c.youtubeRedirectUri,
  }))
}
export const youtubeAccount = (event: H3Event) =>
  youtube().ownedAccount(getCookie(event, 'qroke_youtube'), playlistAccess(event).owner)
export async function youtubeResult<T>(action: () => Promise<T> | T): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof PlaylistError)
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    throw createError({ statusCode: 502, statusMessage: 'Não foi possível carregar o YouTube.' })
  }
}
