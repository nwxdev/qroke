import { mongoConnection } from '../core/connections'
import { cleanupParties } from '../core/party-cleanup'
export default defineNitroPlugin((app) => {
  let running = false
  const clean = async () => {
    if (running) return
    running = true
    try {
      const config = useRuntimeConfig()
      const db = (await mongoConnection(config.mongodbUri)).db(config.mongodbDatabase)
      await cleanupParties(db)
    } catch {
      console.warn('Limpeza de festas adiada; nova tentativa no próximo ciclo.')
    } finally {
      running = false
    }
  }
  const timer = setInterval(() => {
    void clean()
  }, 60000)
  timer.unref()
  app.hooks.hook('close', () => {
    clearInterval(timer)
  })
})
