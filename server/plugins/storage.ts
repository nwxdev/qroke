import { dragonflyConnection, closeConnections } from '../core/connections'
export default defineNitroPlugin(async (app) => {
  const config = useRuntimeConfig()
  if (
    config.accessRequired &&
    (config.sessionSecret.length < 32 ||
      config.encryptionKey.length !== 64 ||
      !/^\d{6,8}$/.test(config.hostPin))
  )
    throw new Error('Configure os secrets de produção do QRoke.')
  await (await openParty(config.organizationId, config.partyId)).ensure()
  await dragonflyConnection(config.dragonflyUrl)
  app.hooks.hook('close', closeConnections)
})
