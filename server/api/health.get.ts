import { mongoConnection, dragonflyConnection } from '../core/connections'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const c = useRuntimeConfig()
    const [mongo, redis] = await Promise.all([
      mongoConnection(c.mongodbUri),
      dragonflyConnection(c.dragonflyUrl),
    ])
    await Promise.all([mongo.db(c.mongodbDatabase).command({ ping: 1 }), redis.ping()])
    await (await openParty(c.organizationId, c.partyId)).state()
    return { status: 'ok' }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Dependências indisponíveis.' })
  }
})
