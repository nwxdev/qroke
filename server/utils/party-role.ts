import type { H3Event } from 'h3'
import { hashToken } from '../core/mongo-database'
import type { Membership } from '../core/browser-sessions'
export async function partyRole(event: H3Event): Promise<'owner' | 'dj' | 'guest'> {
  const details = await party(event).details()
  const browser = browserIdentity(event)
  if (details.createdBy) {
    if (browser && hashToken(browser) === details.createdBy) return 'owner'
    const member = event.context.qrokeMembership as Membership | undefined
    if (member) {
      const current = await party(event)
        .db.collection<Membership>('memberships')
        .findOne({
          _id: member._id,
          scope: party(event).scope,
          expiresAt: { $gt: new Date() },
        })
      const source = current?.linkedFrom
        ? await party(event)
            .db.collection<Membership>('memberships')
            .findOne({
              _id: current.linkedFrom,
              scope: party(event).scope,
              expiresAt: { $gt: new Date() },
            })
        : current
      if (source?.browserHash === details.createdBy && source.role === 'owner') return 'owner'
      if (source?.dj) return 'dj'
    }
    return 'guest'
  }
  return event.context.qrokeAccess?.role === 'owner' ? 'owner' : 'guest'
}
export async function requirePartyOwner(event: H3Event) {
  if ((await partyRole(event)) !== 'owner')
    throw createError({
      statusCode: 403,
      statusMessage: 'Somente o dono da festa pode fazer isso.',
    })
}
