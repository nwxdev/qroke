import { EncryptedStore } from '../../core/shared-store'
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.accessRequired) return networkInvite().check()
  const database = party(event)
  const store = new EncryptedStore<{ token: string; expires: number }>(
    database.db,
    database.scope,
    'invite',
    config.encryptionKey,
  )
  const saved = await store.get('current')
  if (!saved || !(await database.acceptInvite(saved.token)))
    return {
      url: '',
      status: 'unreachable',
      checkedAt: Date.now(),
      message: 'O anfitrião precisa gerar o convite desta festa.',
    }
  return {
    url:
      config.public.partyUrl +
      '/entrar#festa=' +
      encodeURIComponent(database.partyId) +
      '&convite=' +
      saved.token,
    status: 'ok',
    checkedAt: Date.now(),
    message: 'Convite disponível para esta festa.',
  }
})
