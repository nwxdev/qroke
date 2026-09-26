export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id'),
    s = party().state(),
    item = s.queue.find((t) => t.queueId === id)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'A faixa já saiu da fila.' })
  const isAdmin = party().admin(getCookie(event, 'qroke_admin'), true)
  if (!isAdmin && party().guest(getCookie(event, 'qroke_guest'))?.id !== item.guestId)
    throw createError({
      statusCode: 403,
      statusMessage: 'Você só pode remover suas próprias músicas.',
    })
  party().mutate((s) => {
    s.queue = s.queue.filter((t) => t.queueId !== id)
  })
  return { ok: true }
})
