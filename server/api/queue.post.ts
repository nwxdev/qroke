import { randomUUID } from 'node:crypto'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const guest = requireGuest(event)
  const input = await readValidatedBody(
    event,
    z.object({
      id: z.string().max(64),
      source: z.enum(['youtube', 'local']),
      karaoke: z.boolean().default(false),
    }).parse,
  )
  const track =
    input.source === 'local'
      ? (await library()).files.get(input.id)?.track
      : catalog().selected(input.id, input.karaoke)
  if (!track)
    throw createError({
      statusCode: 400,
      statusMessage: 'Busque a faixa novamente antes de adicionar.',
    })
  const state = party().mutate((s) => {
    if (
      [...s.queue, ...(s.current ? [s.current] : [])].some(
        (t) => t.guestId === guest.id && t.source === track.source && t.id === track.id,
      )
    )
      return
    s.queue.push({
      ...track,
      queueId: randomUUID(),
      guestId: guest.id,
      guestName: guest.name,
      origin: 'human',
      enqueuedAt: Date.now(),
      round: 0,
      manualOrder: null,
    })
    startNext(s)
  })
  return { revision: state.revision }
})
