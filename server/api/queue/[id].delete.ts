export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id'),
    s = await party(event).state(),
    item = s.queue.find((t) => t.queueId === id)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'A faixa já saiu da fila.' })
  const isAdmin = await party(event).admin(getCookie(event, 'qroke_admin'), true)
  if (!isAdmin && (await party(event).guest(getCookie(event, 'qroke_guest')))?.id !== item.guestId)
    throw createError({
      statusCode: 403,
      statusMessage: 'Você só pode remover suas próprias músicas.',
    })
  await party(event).mutate(async (s) => {
    s.queue = s.queue.filter((t) => t.queueId !== id)
  })
  return { ok: true }
})
