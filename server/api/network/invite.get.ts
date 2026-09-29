export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.accessRequired && !event.context.qrokeScoped) return networkInvite().check()
  const database = party(event),
    saved = await partyInviteStore(event).get('current')
  if (!saved || !(await database.acceptInvite(saved.token)))
    return {
      url: '',
      status: 'unreachable',
      checkedAt: Date.now(),
      message: 'O anfitrião precisa gerar o convite desta festa.',
    }
  return {
    url:
      String(config.public.partyUrl).replace(/\/$/, '') +
      (event.context.qrokeScoped
        ? '/f/' + encodeURIComponent(database.partyId) + '#convite=' + saved.token
        : '/entrar#festa=' + encodeURIComponent(database.partyId) + '&convite=' + saved.token),
    status: 'ok',
    checkedAt: Date.now(),
    message: 'Convite disponível para esta festa.',
  }
})
