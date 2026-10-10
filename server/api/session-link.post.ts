import { randomBytes } from 'node:crypto'
import { dragonflyConnection, rateLimit } from '../core/connections'
import { hashToken } from '../core/mongo-database'
export default defineEventHandler(async (event) => {
  const member = event.context.qrokeMembership
  if (!member)
    throw createError({ statusCode: 400, statusMessage: 'Entre em uma festa para vincular.' })
  const config = useRuntimeConfig()
  if (!(await rateLimit(config.dragonflyUrl, 'session-link:' + member._id, 10)))
    throw createError({ statusCode: 429, statusMessage: 'Aguarde um minuto.' })
  const token = randomBytes(16).toString('base64url')
  const redis = await dragonflyConnection(config.dragonflyUrl)
  await redis.set(
    'qroke:session-link:' + config.mongodbDatabase + ':' + hashToken(token),
    JSON.stringify({
      organizationId: party(event).organizationId,
      partyId: party(event).partyId,
      source: member.linkedFrom || member._id,
    }),
    { EX: 300 },
  )
  return { code: token, expiresIn: 300 }
})
