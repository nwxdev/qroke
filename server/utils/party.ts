import type { H3Event } from 'h3'
import { MongoPartyDatabase, initializeDatabase } from '../core/mongo-database'
import { mongoConnection, dragonflyConnection } from '../core/connections'
let initialized: Promise<void> | undefined
export async function openParty(organizationId: string, partyId: string) {
  const config = useRuntimeConfig()
  const client = await mongoConnection(config.mongodbUri)
  const db = client.db(config.mongodbDatabase)
  await (initialized ||= initializeDatabase(db)
    .then(async () => {
      await new MongoPartyDatabase(
        client,
        db,
        config.organizationId,
        config.partyId,
        undefined,
        String(config.radioDefault) !== 'false',
      ).ensure()
    })
    .catch((e) => {
      initialized = undefined
      throw e
    }))
  return new MongoPartyDatabase(
    client,
    db,
    organizationId,
    partyId,
    async (scope) => {
      const redis = await dragonflyConnection(config.dragonflyUrl)
      await redis.publish('qroke:events:' + config.mongodbDatabase + ':' + scope, 'changed')
    },
    String(config.radioDefault) !== 'false',
  )
}
export function party(event: H3Event): MongoPartyDatabase {
  if (!event.context.qrokeParty)
    throw createError({ statusCode: 503, statusMessage: 'Festa indisponível.' })
  return event.context.qrokeParty as MongoPartyDatabase
}
export async function publishWarning(database: MongoPartyDatabase, warning: string | null) {
  if ((await database.state()).catalogWarning !== warning)
    await database.mutate((s) => {
      s.catalogWarning = warning
    })
}
