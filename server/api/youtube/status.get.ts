export default defineEventHandler(async (event) => {
  await playlistAccess(event)
  const service = await youtube(event)
  const connectOrigin = service.configured ? new URL(service.config.redirect).origin : ''
  return {
    publicConfigured: !!service.config.key,
    oauthConfigured: service.configured,
    connected: await service.connected(await youtubeAccount(event)),
    connectHere:
      connectOrigin ===
      (useRuntimeConfig().accessRequired ? requestOrigin() : getRequestURL(event).origin),
    connectOrigin,
  }
})
