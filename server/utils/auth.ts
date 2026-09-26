import { timingSafeEqual } from 'node:crypto'
import { createError, getCookie, getHeader, getRequestIP, setCookie, type H3Event } from 'h3'
export const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, path: '/' }
export function requireAdmin(event: H3Event, touch = true) {
  if (!party().admin(getCookie(event, 'qroke_admin'), touch))
    throw createError({ statusCode: 401, statusMessage: 'Destrave com o PIN do anfitrião.' })
}
export function requireGuest(event: H3Event) {
  const guest = party().guest(getCookie(event, 'qroke_guest'))
  if (!guest) throw createError({ statusCode: 401, statusMessage: 'Informe seu nome para entrar.' })
  return guest
}
export function requireDevice(event: H3Event) {
  const token = getHeader(event, 'x-qroke-device-key')
  const device =
    token &&
    (party().db.prepare('SELECT id FROM devices WHERE token=?').get(token) as
      { id: string } | undefined)
  if (!device) throw createError({ statusCode: 401, statusMessage: 'Dispositivo não registrado.' })
  return device
}
export function requirePlayer(event: H3Event) {
  const device = requireDevice(event)
  if (party().state().playerId !== device.id)
    throw createError({ statusCode: 403, statusMessage: 'Este dispositivo não é o PLAYER.' })
  if (Date.now() < party().state().playerReadyAt)
    throw createError({ statusCode: 409, statusMessage: 'Transferência do PLAYER em andamento.' })
  return device
}
export function login(event: H3Event, pin: string) {
  if (!party().attempt(getRequestIP(event) || 'unknown'))
    throw createError({
      statusCode: 429,
      statusMessage: 'Aguarde um minuto antes de tentar novamente.',
    })
  const expected = String(useRuntimeConfig().hostPin)
  if (!/^\d{4,8}$/.test(expected))
    throw createError({
      statusCode: 503,
      statusMessage: 'Configure QROKE_HOST_PIN com 4 a 8 dígitos no servidor.',
    })
  const a = Buffer.from(pin),
    b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw createError({ statusCode: 401, statusMessage: 'PIN incorreto.' })
  const lease = party().claimAdmin(getCookie(event, 'qroke_admin'), adminLeaseSeconds())
  if (!lease.granted)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Outro anfitrião está no controle. Aguarde o tempo restante ou peça para ele sair.',
      data: { expiresAt: lease.expiresAt },
    })
  setCookie(event, 'qroke_admin', lease.token, cookieOptions)
}
export function adminLeaseSeconds() {
  const value = Number(useRuntimeConfig().adminLeaseSeconds)
  return Number.isInteger(value) && value >= 30 && value <= 3600 ? value : 120
}
