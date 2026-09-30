import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { MEDIA_PROVIDERS, MEDIA_CHANNELS, mediaIdentity } from '../../shared/media'
export default defineEventHandler(async (event) => {
  const guest = await requireGuest(event)
  const input = await readValidatedBody(
    event,
    z.object({
      id: z.string().max(64),
      source: z.enum(MEDIA_PROVIDERS),
      channel: z.enum(MEDIA_CHANNELS).optional(),
      karaoke: z.boolean().default(false),
      singers: z.array(z.string().uuid()).max(50).default([]),
    }).parse,
  )
  const track = await mediaProvider(event, input.source).resolve(
    input.id,
    input.channel || (input.karaoke ? 'karaoke' : 'music'),
  )
  if (!track)
    throw createError({
      statusCode: 400,
      statusMessage: 'Busque a faixa novamente antes de adicionar.',
    })
  const singers = track.karaoke ? await karaokeParticipants(event, input.singers, guest) : undefined
  const state = await party(event).mutate(async (s) => {
    if (
      [...s.queue, ...(s.current ? [s.current] : [])].some(
        (t) => mediaIdentity(t) === mediaIdentity(track),
      )
    )
      return
    if (s.queue.filter((t) => t.guestId === guest.id).length >= 200)
      throw createError({
        statusCode: 429,
        statusMessage: 'Aguarde suas músicas antes de adicionar mais.',
      })
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
