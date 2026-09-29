import { z } from 'zod'
import { enqueuePlaylist } from '../../core/youtube-playlists'
export default defineEventHandler(async (event) => {
  const access = await playlistAccess(event)
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
  await playlistAccess(event)
  if ((await party(event).state()).queue.length > 1800)
    throw createError({
      statusCode: 409,
      statusMessage: 'A fila está cheia. Aguarde algumas músicas antes de importar outro lote.',
    })
  const selectedSingers = await karaokeParticipants(
    event,
    input.singers,
    (await playlistAccess(event)).guest,
  )
  const preview = await youtubeResult(async () =>
    input.videoId
      ? await (await youtube(event)).peek(input.ticket, access.owner, await youtubeAccount(event))
      : await (
          await youtube(event)
        ).consume(input.ticket, access.owner, await youtubeAccount(event)),
  )
  const tracks = input.videoId
    ? preview.tracks.filter((track) => track.id === input.videoId)
    : preview.tracks
  if (input.videoId && !tracks.length)
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta faixa não está mais disponível. Confira a playlist novamente.',
    })
  await recheckPlaylistAccess(event, access.owner)
  const currentAccess = await playlistAccess(event)
  let result = { added: 0, duplicates: 0 }
  const state = await party(event).mutate(async (s) => {
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
