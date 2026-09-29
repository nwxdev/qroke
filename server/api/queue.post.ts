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
      singers: z.array(z.string().uuid()).max(50).default([]),
    }).parse,
  )
  if (input.source === 'youtube' && party().youtubeBlocked(input.id))
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta versão ficou indisponível. Busque outra versão da música.',
    })
  const track =
    input.source === 'local'
      ? (await library()).files.get(input.id)?.track
      : catalog().selected(input.id, input.karaoke)
  if (!track)
    throw createError({
      statusCode: 400,
      statusMessage: 'Busque a faixa novamente antes de adicionar.',
    })
  const singers = track.karaoke ? karaokeParticipants(input.singers, guest) : undefined
  const state = party().mutate((s) => {
    if (
      [...s.queue, ...(s.current ? [s.current] : [])].some(
        (t) => t.source === track.source && t.id === track.id,
      )
    )
      return
    s.queue.push({
      ...track,
      ...(singers ? { singers } : {}),
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
