import { randomBytes } from 'node:crypto'
import { setCookie, type H3Event } from 'h3'
import { BrowserSessions, type Credential, type Membership } from '../core/browser-sessions'
export function browserIdentity(event: H3Event, create = false) {
  if (event.context.qrokeBrowser) return event.context.qrokeBrowser as string
  const saved = getCookie(event, 'qroke_browser')
  if (saved && /^[a-zA-Z0-9_-]{43}$/.test(saved)) return (event.context.qrokeBrowser = saved)
  if (!create) return undefined
  const token = randomBytes(32).toString('base64url')
  setCookie(event, 'qroke_browser', token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 86400,
  })
  return (event.context.qrokeBrowser = token)
}
export function browserSessions(event: H3Event) {
  return new BrowserSessions(party(event).db, useRuntimeConfig().encryptionKey)
}
export function partyCredential(event: H3Event, kind: Credential) {
  const member = event.context.qrokeMembership as Membership | undefined
  if (event.context.qrokeScoped)
    return member ? browserSessions(event).read(member, kind) : undefined
  return getCookie(event, kind)
}
export async function setPartyCredential(
  event: H3Event,
  kind: Credential,
  value: string | undefined,
  options: Parameters<typeof setCookie>[3] = {},
) {
  if (event.context.qrokeScoped) {
    const member = event.context.qrokeMembership as Membership | undefined
    if (!member) throw createError({ statusCode: 401, statusMessage: 'Entre na festa.' })
    await party(event).assertActive()
    return browserSessions(event).set(member, kind, value)
  }
  if (value) setCookie(event, kind, value, { ...cookieOptions(), ...options })
  else deleteCookie(event, kind, { path: '/' })
}
export async function loadMembership(event: H3Event) {
  const browser = browserIdentity(event)
  if (!browser) return
  const database = party(event)
  const member = await browserSessions(event).get(browser, database.scope)
  if (!member) return
  const principal = await browserSessions(event).principal(member)
  if (!principal) return
  if (principal.role === 'guest') {
    const invite = await database.inviteVersion()
    if (!invite || invite.version !== principal.version || invite.expiresAt <= Date.now()) return
  }
  event.context.qrokeMembership = member
  event.context.qrokeAccess = {
    organizationId: member.organizationId,
    partyId: member.partyId,
    role: member.role,
    version: member.version,
    expires: member.expiresAt.getTime(),
  }
  return member
}
export async function grantMembership(
  event: H3Event,
  role: 'owner' | 'guest',
  version: number,
  expires: number,
) {
  const database = party(event)
  await database.assertActive()
  const browser = browserIdentity(event, true)!
  const existing = await browserSessions(event).get(browser, database.scope)
  if (existing?.role === 'owner' && role === 'guest') {
    role = 'owner'
    version = 0
    expires = existing.expiresAt.getTime()
  }
  const member = await browserSessions(event).grant(browser, {
    organizationId: database.organizationId,
    partyId: database.partyId,
    scope: database.scope,
    role,
    version,
    expiresAt: new Date(expires),
  })
  event.context.qrokeMembership = member
  event.context.qrokeAccess = {
    organizationId: member.organizationId,
    partyId: member.partyId,
    role: member.role,
    version: member.version,
    expires: member.expiresAt.getTime(),
  }
  return member
}
