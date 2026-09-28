import { z } from 'zod'
import { enqueuePlaylist } from '../../core/youtube-playlists'
export default defineEventHandler(async (event) => {
  const access = playlistAccess(event)
  const input = await readValidatedBody(
    event,
    z.object({
      ticket: z.string().min(20).max(100),
      videoId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{11}$/)
        .optional(),
      singers: z.array(z.string().uuid()).max(50).default([]),
    }).parse,
  )
  playlistAccess(event)
  if (party().state().queue.length > 1800)
    throw createError({
      statusCode: 409,
      statusMessage: 'A fila está cheia. Aguarde algumas músicas antes de importar outro lote.',
    })
  const selectedSingers = karaokeParticipants(input.singers, playlistAccess(event).guest)
  const preview = await youtubeResult(() =>
    input.videoId
      ? youtube().peek(input.ticket, access.owner, youtubeAccount(event))
      : youtube().consume(input.ticket, access.owner, youtubeAccount(event)),
  )
  const tracks = input.videoId
    ? preview.tracks.filter((track) => track.id === input.videoId)
    : preview.tracks
  if (input.videoId && !tracks.length)
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta faixa não está mais disponível. Confira a playlist novamente.',
    })
  recheckPlaylistAccess(event, access.owner)
  const currentAccess = playlistAccess(event)
  let result = { added: 0, duplicates: 0 }
  const state = party().mutate((s) => {
    if (s.queue.length + tracks.length > 2000)
      throw createError({ statusCode: 409, statusMessage: 'A fila está cheia.' })
    result = enqueuePlaylist(s, tracks, Date.now(), {
      guest: currentAccess.guest,
      playlist: input.videoId ? undefined : preview.playlist,
      singers: preview.tracks.some((track) => track.karaoke) ? selectedSingers : undefined,
    })
    startNext(s)
  })
  return { ...result, revision: state.revision }
})
