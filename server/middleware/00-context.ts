export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const config = useRuntimeConfig()
  if (event.path.split('?')[0] === '/api/health') return
  const authenticated = await validateAccess(getCookie(event, 'qroke_access'))
  if (authenticated) {
    event.context.qrokeAccess = authenticated.access
    event.context.qrokeParty = authenticated.database
  } else {
    event.context.qrokeParty = await openParty(config.organizationId, config.partyId)
  }
  const open = ['/api/access', '/api/network/probe', '/api/youtube/callback']
  if (config.accessRequired && !authenticated && !open.includes(event.path.split('?')[0]!))
    throw createError({ statusCode: 401, statusMessage: 'Abra o convite da festa para entrar.' })
})
