import { MongoClient } from 'mongodb'
import { createClient } from 'redis'

let mongo: MongoClient | undefined
let mongoReady: Promise<MongoClient> | undefined
let redis: ReturnType<typeof createClient> | undefined
let redisReady: Promise<ReturnType<typeof createClient>> | undefined
const subscriptions = new Set<ReturnType<typeof createClient>>()
export async function mongoConnection(uri: string) {
  if (!uri) throw new Error('Configure QROKE_MONGODB_URI.')
  if (!mongoReady) {
    mongo = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    })
    mongoReady = mongo.connect().catch((error) => {
      mongoReady = undefined
      throw error
    })
  }
  return mongoReady
}
export async function dragonflyConnection(url: string) {
  if (!url) throw new Error('Configure QROKE_DRAGONFLY_URL.')
  if (!redisReady) {
    redis = createClient({
      url,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) =>
          retries < 5 ? Math.min(200 * (retries + 1), 1000) : new Error('Dragonfly indisponível.'),
      },
    })
    redis.on('error', () => {
      /* Health checks report dependency failure without logging credentials. */
    })
    redisReady = redis
      .connect()
      .then(() => redis!)
      .catch((error) => {
        redisReady = undefined
        throw error
      })
  }
  return redisReady
}
export async function dragonflySubscription(url: string) {
  const client = (await dragonflyConnection(url)).duplicate()
  client.on('error', () => {})
  subscriptions.add(client)
  try {
    await client.connect()
    return client
  } catch (error) {
    subscriptions.delete(client)
    if (client.isOpen) client.destroy()
    throw error
  }
}
export async function closeConnections() {
  for (const client of subscriptions) if (client.isOpen) client.destroy()
  subscriptions.clear()
  if (redis?.isOpen) redis.destroy()
  await mongo?.close()
  mongoReady = undefined
  redisReady = undefined
}
export async function rateLimit(url: string, key: string, cap: number, seconds = 60) {
  const redis = await dragonflyConnection(url)
  const count = Number(
    await redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      {
        keys: [
          'qroke:limit:' +
            (process.env.NUXT_MONGODB_DATABASE || process.env.QROKE_MONGODB_DATABASE || 'qroke') +
            ':' +
            key,
        ],
        arguments: [String(seconds)],
      },
    ),
  )
  return count <= cap
}
