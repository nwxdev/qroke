export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await party(event).mutate(async (state) => {
    const item = state.queue.find((track) => track.queueId === id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'A faixa já saiu da fila.' })
    if (
      !(await isPartyAdmin(event)) &&
      (await party(event).guest(partyCredential(event, 'qroke_guest')))?.id !== item.guestId
    )
      throw createError({
        statusCode: 403,
        statusMessage: 'Você só pode remover suas próprias músicas.',
      })
    state.queue = state.queue.filter((track) => track.queueId !== id)
  })
  return { ok: true }
})
