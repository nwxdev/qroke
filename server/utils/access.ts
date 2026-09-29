import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
export type Access = {
  organizationId: string
  partyId: string
  role: 'owner' | 'guest'
  version: number
  expires: number
}
export function signAccess(value: Access) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return (
    payload +
    '.' +
    createHmac('sha256', useRuntimeConfig().sessionSecret).update(payload).digest('base64url')
  )
}
export function readAccess(token: string | undefined): Access | undefined {
  if (!token || !useRuntimeConfig().sessionSecret) return
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return
  const expected = createHmac('sha256', useRuntimeConfig().sessionSecret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Access
    if (
      value.expires <= Date.now() ||
      !['owner', 'guest'].includes(value.role) ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(value.organizationId) ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(value.partyId)
    )
      return
    return value
  } catch {
    return
  }
}
export function secureCookie() {
  return String(useRuntimeConfig().public.partyUrl).startsWith('https://')
}
export function requestOrigin() {
  return String(useRuntimeConfig().public.partyUrl || '')
}
export function requestIp(event: H3Event) {
  // This mode requires the app port to be private and reachable only through our Nginx.
  return getRequestIP(event, { xForwardedFor: useRuntimeConfig().trustProxy }) || 'unknown'
}
export function requireOwner(event: H3Event) {
  if (
    (useRuntimeConfig().accessRequired || event.context.qrokeScoped) &&
    event.context.qrokeAccess?.role !== 'owner'
  )
    throw createError({ statusCode: 403, statusMessage: 'Entre com o acesso do anfitrião.' })
}
export async function validateAccess(token: string | undefined) {
  const access = readAccess(token)
  if (!access) return undefined
  const database = await openParty(access.organizationId, access.partyId)
  await database.assertActive()
  if (access.role === 'guest') {
    const invite = await database.inviteVersion()
    if (!invite || invite.version !== access.version || invite.expiresAt <= Date.now())
      return undefined
  }
  return { access, database }
}
