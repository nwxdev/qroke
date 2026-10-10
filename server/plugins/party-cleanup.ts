import { mongoConnection, dragonflyConnection } from '../core/connections'
import { cleanupParties } from '../core/party-cleanup'
export default defineNitroPlugin((app) => {
  let running = false
  const clean = async () => {
    if (running) return
    running = true
    try {
      const config = useRuntimeConfig()
      const db = (await mongoConnection(config.mongodbUri)).db(config.mongodbDatabase)
      const redis = await dragonflyConnection(config.dragonflyUrl)
      await cleanupParties(db, new Date(), 25, async (scope) => {
        // SCAN is incremental. Only this party's keys in this database are removed.
        for (const pattern of [
          'qroke:catalog:' + db.databaseName + ':' + scope + ':*',
          'qroke:presence:' + db.databaseName + ':' + scope + ':*',
        ]) {
          for await (const keys of redis.scanIterator({ MATCH: pattern, COUNT: 100 }))
            if (keys.length) await redis.unlink(keys)
        }
        const tvKey = 'qroke:tv:' + db.databaseName + ':party:' + scope
        const codeKey = await redis.getDel(tvKey)
        if (codeKey) await redis.unlink(codeKey)
      })
    } catch {
      console.warn('Limpeza de festas adiada; nova tentativa no próximo ciclo.')
    } finally {
      running = false
    }
  }
  void clean()
  const timer = setInterval(() => {
    void clean()
  }, 60000)
  timer.unref()
  app.hooks.hook('close', () => {
    clearInterval(timer)
  })
})
