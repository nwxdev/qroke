import { createError, getHeader, type H3Event } from 'h3'
export function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict' as const, secure: secureCookie(), path: '/' }
}
export async function isPartyAdmin(event: H3Event, touch = true) {
  if ((await party(event).details()).createdBy)
    return ['owner', 'dj'].includes(await partyRole(event))
  return party(event).admin(partyCredential(event, 'qroke_admin'), touch)
}
export async function requireAdmin(event: H3Event, touch = true) {
  const managed = !!(await party(event).details()).createdBy
  if (!managed) requireOwner(event)
  if (!(await isPartyAdmin(event, touch)))
    throw createError({
      statusCode: managed ? 403 : 401,
      statusMessage: managed
        ? 'Peça ao dono da festa acesso de DJ.'
        : 'Destrave com o PIN do anfitrião.',
    })
}
export async function requireGuest(event: H3Event) {
  const guest = await party(event).guest(partyCredential(event, 'qroke_guest'))
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
  await verifyPartyPin(event, pin)
  const lease = await party(event).claimAdmin(
    partyCredential(event, 'qroke_admin'),
    adminLeaseSeconds(),
  )
  if (!lease.granted)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Outro anfitrião está no controle. Aguarde o tempo restante ou peça para ele sair.',
      data: { expiresAt: lease.expiresAt },
    })
  await setPartyCredential(event, 'qroke_admin', lease.token)
}
export function adminLeaseSeconds() {
  const value = Number(useRuntimeConfig().adminLeaseSeconds)
  return Number.isInteger(value) && value >= 30 && value <= 3600 ? value : 120
}
