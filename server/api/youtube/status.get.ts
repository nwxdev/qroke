export default defineEventHandler((event) => {
  requireAdmin(event)
  const service = youtube()
  const connectOrigin = service.configured ? new URL(service.config.redirect).origin : ''
  return {
    publicConfigured: !!service.config.key,
    oauthConfigured: service.configured,
    connected: service.connected(youtubeAccount(event)),
    connectHere: connectOrigin === getRequestURL(event).origin,
    connectOrigin,
  }
})
