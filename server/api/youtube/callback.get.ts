import { randomBytes } from 'node:crypto'
import { ACCOUNT_SECONDS } from '../../core/youtube-playlists'
export default defineEventHandler(async (event) => {
  const service = youtube(),
    query = getQuery(event)
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const nonce = randomBytes(24).toString('base64')
  setHeader(
    event,
    'Content-Security-Policy',
    "default-src 'none'; script-src 'nonce-" + nonce + "'; frame-ancestors 'none'; base-uri 'none'",
  )
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  let result = 'error'
  try {
    if (
      !service.configured ||
      getRequestURL(event).origin !== new URL(service.config.redirect).origin
    )
      throw new Error('Invalid origin')
    const id = await service.complete(
      typeof query.state === 'string' ? query.state : '',
      getCookie(event, 'qroke_youtube_oauth') || '',
      typeof query.code === 'string' && query.code.length < 4096 ? query.code : '',
      !!query.error,
    )
    setCookie(event, 'qroke_youtube', id, {
      httpOnly: true,
      sameSite: 'strict',
      secure: getRequestURL(event).protocol === 'https:',
      path: '/',
      maxAge: ACCOUNT_SECONDS,
    })
    result = 'connected'
  } catch {
    result = query.error === 'access_denied' ? 'cancelled' : 'error'
  }
  deleteCookie(event, 'qroke_youtube_oauth', { path: '/api/youtube/callback' })
  const message =
    result === 'connected'
      ? 'YouTube conectado. Volte ao painel; se o controle expirou, use o PIN novamente.'
      : 'Conexão não concluída. Volte ao painel e tente novamente; confira as credenciais, o redirecionamento e a permissão de leitura.'
  // O callback não renova nem concede a sessão de anfitrião.
  return (
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>QRokê · YouTube</title><body><h1>' +
    message +
    '</h1><p><a href="/host">Voltar ao painel</a></p><script nonce="' +
    nonce +
    '">' +
    'if(window.opener){window.opener.postMessage({type:"qroke-youtube",result:' +
    JSON.stringify(result) +
    '},window.location.origin);window.close()}' +
    '</script></body></html>'
  )
})
