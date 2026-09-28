import type { H3Event } from 'h3'
// Identidade da festa e conta Google são independentes do PIN do anfitrião.
// Uma conta OAuth só pode ser usada pelo ator que iniciou sua autorização.
export function playlistAccess(event: H3Event) {
  const guest = party().guest(getCookie(event, 'qroke_guest'))
  if (guest) return { owner: 'guest:' + guest.id, guest }
  requireAdmin(event)
  return { owner: getCookie(event, 'qroke_admin')!, guest: undefined }
}
export function recheckPlaylistAccess(event: H3Event, owner: string, account?: string) {
  if (playlistAccess(event).owner !== owner || (account && youtubeAccount(event) !== account))
    throw createError({
      statusCode: 409,
      statusMessage: 'A conexão mudou. Conecte e confira a playlist novamente.',
    })
}
const limits = new Map<string, { count: number; until: number }>()
export function playlistLimit(event: H3Event, owner: string) {
  const now = Date.now()
  for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
  for (const [key, cap] of [
    [owner, 12],
    ['ip:' + (getRequestIP(event) || 'unknown'), 30],
  ] as const) {
    const value = limits.get(key) || { count: 0, until: now + 60000 }
    limits.set(key, value)
    if (++value.count > cap)
      throw createError({
        statusCode: 429,
        statusMessage: 'Muitas consultas de playlists. Aguarde um minuto.',
      })
  }
}
