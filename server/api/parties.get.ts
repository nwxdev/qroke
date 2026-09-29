import { hashToken, type PartyRow } from '../core/mongo-database'
import { partyInfo } from '../core/party-lifecycle'
import type { Membership } from '../core/browser-sessions'
export default defineEventHandler(async (event) => {
  const browser = browserIdentity(event, true)!,
    database = party(event)
  const legacy = await validateAccess(getCookie(event, 'qroke_access')).catch(() => undefined)
  if (legacy) {
    event.context.qrokeParty = legacy.database
    const existing = await browserSessions(event).get(browser, legacy.database.scope)
    if (!existing) {
      await grantMembership(event, legacy.access.role, legacy.access.version, legacy.access.expires)
      event.context.qrokeScoped = true
      for (const kind of ['qroke_guest', 'qroke_admin', 'qroke_youtube'] as const) {
        const value = getCookie(event, kind)
        if (value) await setPartyCredential(event, kind, value)
      }
    }
  }
  const members = await database.db
    .collection<Membership>('memberships')
    .find({ browserHash: hashToken(browser), expiresAt: { $gt: new Date() } })
    .limit(100)
    .toArray()
  const rows = await database.db
    .collection<PartyRow>('parties')
    .find({ _id: { $in: members.map((member) => member.scope) } })
    .toArray()
  const parties = []
  for (const row of rows) {
    const member = members.find((item) => item.scope === row._id)!
    const info = partyInfo(row)
    if (info.status !== 'active') continue
    if (
      member.role === 'guest' &&
      (!row.invite || row.invite.version !== member.version || row.invite.expiresAt <= Date.now())
    )
      continue
    parties.push({ ...info, role: member.role })
  }
  return {
    parties: parties.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    serverTime: Date.now(),
  }
})
