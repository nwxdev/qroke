import { timingSafeEqual } from 'node:crypto'
import { createError, getCookie, getHeader, setCookie, type H3Event } from 'h3'
import { rateLimit } from '../core/connections'
export function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict' as const, secure: secureCookie(), path: '/' }
}
export async function requireAdmin(event: H3Event, touch = true) {
  requireOwner(event)
  if (!(await party(event).admin(getCookie(event, 'qroke_admin'), touch)))
    throw createError({ statusCode: 401, statusMessage: 'Destrave com o PIN do anfitrião.' })
}
export async function requireGuest(event: H3Event) {
  const guest = await party(event).guest(getCookie(event, 'qroke_guest'))
  if (!guest) throw createError({ statusCode: 401, statusMessage: 'Informe seu nome para entrar.' })
  return guest
}
export async function requireDevice(event: H3Event) {
  const device = await party(event).device(getHeader(event, 'x-qroke-device-key'))
  if (!device) throw createError({ statusCode: 401, statusMessage: 'Dispositivo não registrado.' })
  return device
}
export async function requirePlayer(event: H3Event) {
  const device = await requireDevice(event),
    state = await party(event).state()
  if (state.playerId !== device.id)
    throw createError({ statusCode: 403, statusMessage: 'Este dispositivo não é o PLAYER.' })
  if (Date.now() < state.playerReadyAt)
    throw createError({ statusCode: 409, statusMessage: 'Transferência do PLAYER em andamento.' })
  return device
}
export async function login(event: H3Event, pin: string) {
  requireOwner(event)
  if (!(await rateLimit(useRuntimeConfig().dragonflyUrl, 'pin:' + requestIp(event), 5)))
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
  const lease = await party(event).claimAdmin(getCookie(event, 'qroke_admin'), adminLeaseSeconds())
  if (!lease.granted)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Outro anfitrião está no controle. Aguarde o tempo restante ou peça para ele sair.',
      data: { expiresAt: lease.expiresAt },
    })
  setCookie(event, 'qroke_admin', lease.token, cookieOptions())
}
export function adminLeaseSeconds() {
  const value = Number(useRuntimeConfig().adminLeaseSeconds)
  return Number.isInteger(value) && value >= 30 && value <= 3600 ? value : 120
}
