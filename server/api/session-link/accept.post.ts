import { z } from 'zod'
import { dragonflyConnection, rateLimit } from '../../core/connections'
import { hashToken } from '../../core/mongo-database'
import type { Membership } from '../../core/browser-sessions'
export default defineEventHandler(async (event) => {
  const { code } = await readValidatedBody(
    event,
    z.object({ code: z.string().regex(/^[a-zA-Z0-9_-]{22}$/) }).parse,
  )
  const config = useRuntimeConfig()
  if (!(await rateLimit(config.dragonflyUrl, 'session-link-accept:' + requestIp(event), 20)))
    throw createError({ statusCode: 429, statusMessage: 'Aguarde um minuto.' })
  const redis = await dragonflyConnection(config.dragonflyUrl)
  const raw = await redis.getDel(
    'qroke:session-link:' + config.mongodbDatabase + ':' + hashToken(code),
  )
  if (!raw)
    throw createError({
      statusCode: 401,
      statusMessage: 'Código usado ou expirado. Gere outro no navegador de origem.',
    })
  const link = JSON.parse(raw) as { organizationId: string; partyId: string; source: string }
  if (link.organizationId !== config.organizationId) throw createError({ statusCode: 403 })
  event.context.qrokeParty = await openParty(link.organizationId, link.partyId)
  event.context.qrokeScoped = true
  await party(event).assertActive()
  const sessions = browserSessions(event)
  const source = await party(event)
    .db.collection<Membership>('memberships')
    .findOne({
      _id: link.source,
      scope: party(event).scope,
      expiresAt: { $gt: new Date() },
    })
  if (!source) throw createError({ statusCode: 401, statusMessage: 'Sessão original expirada.' })
  if (source.role === 'guest') {
    const invite = await party(event).inviteVersion()
    if (!invite || source.version !== invite.version || invite.expiresAt <= Date.now())
      throw createError({ statusCode: 401, statusMessage: 'Convite revogado.' })
  }
  const member = await grantMembership(
    event,
    source.role,
    source.version,
    source.expiresAt.getTime(),
  )
  const details = await party(event).details()
  // Never overwrite the creator's original membership or link it to itself.
  if (member._id !== source._id && member.browserHash !== details.createdBy)
    await party(event)
      .db.collection<Membership>('memberships')
      .updateOne({ _id: member._id, scope: member.scope }, { $set: { linkedFrom: source._id } })
  const guest = sessions.read(source, 'qroke_guest')
  if (guest) await setPartyCredential(event, 'qroke_guest', guest)
  return { url: '/f/' + link.partyId + (source.role === 'owner' ? '/host' : '/busca') }
})
