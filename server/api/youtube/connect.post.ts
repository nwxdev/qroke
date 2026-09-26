export default defineEventHandler((event) => {
  requireAdmin(event)
  return youtubeResult(() => {
    const service = youtube()
    if (
      service.configured &&
      new URL(service.config.redirect).origin !== getRequestURL(event).origin
    )
      throw createError({
        statusCode: 400,
        statusMessage: 'Abra o painel no endereço configurado para conectar o Google.',
      })
    const flow = service.begin(youtubeAccount(event))
    setCookie(event, 'qroke_youtube_oauth', flow.binding, {
      httpOnly: true,
      sameSite: 'lax',
      secure: getRequestURL(event).protocol === 'https:',
      path: '/api/youtube/callback',
      maxAge: 600,
    })
    return { url: flow.url }
  })
})
