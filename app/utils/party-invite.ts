export interface PartyInvite {
  partyId: string
  token: string | null
}
export function parsePartyInvite(value: string, origin: string): PartyInvite | null {
  const text = value.trim()
  if (!text || text.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(text)) return null
  try {
    const base = new URL(origin)
    const input = text.startsWith(base.host + '/') ? base.protocol + '//' + text : text
    const url = new URL(input, base.origin)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.origin !== base.origin ||
      url.username ||
      url.password
    )
      return null
    const scoped =
      /^\/f\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63})(?:\/(?:entrar|busca|host|player|qr|tv))?\/?$/.exec(
        url.pathname,
      )
    const legacy = ['/', '/entrar'].includes(url.pathname)
    if (!scoped && !legacy) return null
    const fragment = new URLSearchParams(url.hash.slice(1))
    const token = fragment.get('convite')
    if (
      token !== null &&
      (!/^[a-zA-Z0-9_-]{1,100}$/.test(token) || fragment.getAll('convite').length !== 1)
    )
      return null
    const partyId = scoped?.[1] || fragment.get('festa') || url.searchParams.get('festa') || ''
    if (partyId && !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63}$/.test(partyId)) return null
    for (const params of [fragment, url.searchParams]) {
      if (params.getAll('festa').length > 1) return null
      if (params.has('festa') && params.get('festa') !== partyId) return null
    }
    if (!scoped && !token) return null
    return { partyId, token }
  } catch {
    return null
  }
}
