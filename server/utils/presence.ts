import { dragonflyConnection } from '../core/connections'
import type { MongoPartyDatabase } from '../core/mongo-database'
export async function touchPresence(
  database: MongoPartyDatabase,
  kind: 'guest' | 'device',
  id: string,
) {
  const redis = await dragonflyConnection(useRuntimeConfig().dragonflyUrl)
  const key = 'qroke:presence:' + database.db.databaseName + ':' + database.scope + ':' + kind
  const expires = Date.now() + (kind === 'guest' ? 90000 : 20000)
  await redis.multi().zAdd(key, { score: expires, value: id }).expire(key, 120).exec()
}
export async function presentIds(database: MongoPartyDatabase, kind: 'guest' | 'device') {
  const redis = await dragonflyConnection(useRuntimeConfig().dragonflyUrl)
  const key = 'qroke:presence:' + database.db.databaseName + ':' + database.scope + ':' + kind
  await redis.zRemRangeByScore(key, 0, Date.now())
  return new Set(await redis.zRangeByScore(key, Date.now(), '+inf'))
}
