import { hashToken } from '../core/mongo-database'
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const path = event.path.split('?')[0]!,
    config = useRuntimeConfig()
  if (path === '/api/health') return
  const scoped = /^\/api\/f\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63})(\/.*)$/.exec(path)
  if (path.startsWith('/api/f/') && !scoped)
    throw createError({ statusCode: 400, statusMessage: 'Identificador de festa inválido.' })
  if (scoped) {
    event.context.qrokeScoped = true
    event.context.qrokeParty = await openParty(config.organizationId, scoped[1]!)
    const info = await party(event).info()
    if (scoped[2] !== '/party') await party(event).assertActive()
    await loadMembership(event)
    if (!['/access', '/party'].includes(scoped[2]!) && !event.context.qrokeMembership)
      throw createError({
        statusCode: 401,
        statusMessage: 'Abra o convite desta festa para entrar.',
      })
    event.context.qrokePartyInfo = info
    return
  }
  event.context.qrokeParty = await openParty(config.organizationId, config.partyId)
  if (['/api/parties', '/api/tv/connect', '/api/session-link/accept'].includes(path)) return
  if (path === '/api/youtube/callback') {
    const state = getQuery(event).state
    const route =
      typeof state === 'string' && state.length <= 100
        ? await oauthRoutes(event).get(state)
        : undefined
    if (route) {
      if (route.browserHash !== hashToken(browserIdentity(event) || ''))
        throw createError({
          statusCode: 403,
          statusMessage: 'Abra o retorno do Google no mesmo navegador.',
        })
      event.context.qrokeScoped = true
      event.context.qrokeParty = await openParty(route.organizationId, route.partyId)
      await party(event).assertActive()
      if (!(await loadMembership(event)))
        throw createError({ statusCode: 401, statusMessage: 'Acesso à festa expirado.' })
      event.context.qrokeOAuthRoute = route
      return
    }
  }
  const authenticated = await validateAccess(getCookie(event, 'qroke_access'))
  if (authenticated) {
    event.context.qrokeAccess = authenticated.access
    event.context.qrokeParty = authenticated.database
  }
  const open = ['/api/access', '/api/network/probe', '/api/youtube/callback']
  if (config.accessRequired && !authenticated && !open.includes(path))
    throw createError({ statusCode: 401, statusMessage: 'Abra o convite da festa para entrar.' })
})
