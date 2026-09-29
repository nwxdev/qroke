import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { rateLimit } from '../core/connections'
import { hashToken } from '../core/mongo-database'
import { PARTY_LIFETIME, hashPin } from '../core/party-lifecycle'
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(
    event,
    z.object({
      name: z.string().trim().min(2, 'Informe o nome da festa.').max(80),
      pin: z.string().regex(/^\d{6}$/, 'Use um PIN de 6 dígitos.'),
      idempotencyKey: z.string().uuid(),
    }).parse,
  )
  const browser = browserIdentity(event, true)!,
    config = useRuntimeConfig()
  const database = party(event),
    createdBy = hashToken(browser)
  const creationKey = hashToken(createdBy + ':' + input.idempotencyKey)
  const existing = await database.db.collection('parties').findOne({ creationKey, createdBy })
  let target = await openParty(
    config.organizationId,
    existing ? String(existing.partyId) : 'f1.' + randomUUID(),
  )
  if (!existing) {
    if (
      !(await rateLimit(config.dragonflyUrl, 'create-browser:' + createdBy, 5, 3600)) ||
      !(await rateLimit(config.dragonflyUrl, 'create-ip:' + requestIp(event), 30, 3600))
    )
      throw createError({
        statusCode: 429,
        statusMessage: 'Muitas festas criadas. Tente novamente mais tarde.',
      })
    const now = Date.now()
    try {
      await target.create({
        name: input.name,
        pinHash: await hashPin(input.pin),
        createdAt: new Date(now),
        expiresAt: new Date(now + PARTY_LIFETIME),
        purgeAt: new Date(now + 2 * PARTY_LIFETIME),
        createdBy,
        creationKey,
      })
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
      const duplicate = await database.db.collection('parties').findOne({ creationKey, createdBy })
      if (!duplicate) throw error
      target = await openParty(config.organizationId, String(duplicate.partyId))
    }
  }
  await target.assertActive()
  event.context.qrokeScoped = true
  event.context.qrokeParty = target
  const info = await target.info()
  await grantMembership(event, 'owner', 0, info.expiresAt!)
  await ensurePartyInvite(event)
  const lease = await target.claimAdmin(partyCredential(event, 'qroke_admin'), adminLeaseSeconds())
  if (lease.granted) await setPartyCredential(event, 'qroke_admin', lease.token)
  setResponseStatus(event, existing ? 200 : 201)
  return { party: info, url: '/f/' + target.partyId + '/host' }
})
