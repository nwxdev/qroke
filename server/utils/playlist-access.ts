import type { H3Event } from 'h3'
import { rateLimit } from '../core/connections'
export async function playlistAccess(event: H3Event) {
  const guest = await party(event).guest(getCookie(event, 'qroke_guest'))
  if (guest) return { owner: 'guest:' + guest.id, guest }
  await requireAdmin(event)
  return { owner: getCookie(event, 'qroke_admin')!, guest: undefined }
}
export async function recheckPlaylistAccess(event: H3Event, owner: string, account?: string) {
  if (
    (await playlistAccess(event)).owner !== owner ||
    (account && (await youtubeAccount(event)) !== account)
  )
    throw createError({
      statusCode: 409,
      statusMessage: 'A conexão mudou. Conecte e confira a playlist novamente.',
    })
}
export async function playlistLimit(event: H3Event, owner: string) {
  const url = useRuntimeConfig().dragonflyUrl
  if (
    !(await rateLimit(url, party(event).scope + ':playlist:' + owner, 12)) ||
    !(await rateLimit(url, 'playlist-ip:' + requestIp(event), 30))
  )
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas consultas de playlists. Aguarde um minuto.',
    })
}
