import { rateLimit } from '../core/connections'
import { TvCodes, TV_CODE_SECONDS } from '../core/tv-codes'
export default defineEventHandler(async (event) => {
  requireOwner(event)
  await requireAdmin(event)
  const config = useRuntimeConfig(),
    database = party(event)
  await database.assertActive()
  if (!(await rateLimit(config.dragonflyUrl, 'tv-create:' + database.scope, 10)))
    throw createError({
      statusCode: 429,
      statusMessage: 'Aguarde um minuto para gerar outro código.',
    })
  await ensurePartyInvite(event)
  const invite = await database.inviteVersion()
  if (!invite)
    throw createError({ statusCode: 409, statusMessage: 'Gere um convite da festa primeiro.' })
  const expires = Math.min(Date.now() + TV_CODE_SECONDS * 1000, invite.expiresAt)
  const code = await new TvCodes(config.dragonflyUrl, config.mongodbDatabase).issue({
    organizationId: database.organizationId,
    partyId: database.partyId,
    version: invite.version,
    expires,
  })
  setHeader(event, 'cache-control', 'no-store')
  return { code, expires, serverTime: Date.now() }
})
