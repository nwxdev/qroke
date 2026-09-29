import { hashToken } from '../../core/mongo-database'
export default defineEventHandler(async (event) => {
  const access = await playlistAccess(event)
  await playlistLimit(event, access.owner)
  return youtubeResult(async () => {
    const service = await youtube(event)
    if (
      service.configured &&
      new URL(service.config.redirect).origin !==
        (useRuntimeConfig().accessRequired ? requestOrigin() : getRequestURL(event).origin)
    )
      throw createError({
        statusCode: 400,
        statusMessage: 'Abra o painel no endereço configurado para conectar o Google.',
      })
    const flow = await service.begin(await youtubeAccount(event), access.owner)
    if (event.context.qrokeScoped) {
      const info = await party(event).info()
      await oauthRoutes(event).set(new URL(flow.url).searchParams.get('state')!, {
        organizationId: party(event).organizationId,
        partyId: party(event).partyId,
        browserHash: hashToken(browserIdentity(event)!),
        binding: flow.binding,
        expires: Math.min(Date.now() + 600000, info.expiresAt || Infinity),
      })
    } else
      setCookie(event, 'qroke_youtube_oauth', flow.binding, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie(),
        path: '/api/youtube/callback',
        maxAge: 600,
      })
    return { url: flow.url }
  })
})
