import { z } from 'zod'
import { enqueuePlaylist } from '../../core/youtube-playlists'
export default defineEventHandler(async (event) => {
  const access = playlistAccess(event)
  const input = await readValidatedBody(
    event,
    z.object({ ticket: z.string().min(20).max(100) }).parse,
  )
  playlistAccess(event)
  if (party().state().queue.length > 1800)
    throw createError({
      statusCode: 409,
      statusMessage: 'A fila está cheia. Aguarde algumas músicas antes de importar outro lote.',
    })
  const preview = await youtubeResult(() =>
    youtube().consume(input.ticket, access.owner, youtubeAccount(event)),
  )
  recheckPlaylistAccess(event, access.owner)
  const currentAccess = playlistAccess(event)
  let result = { added: 0, duplicates: 0 }
  const state = party().mutate((s) => {
    if (s.queue.length + preview.tracks.length > 2000)
      throw createError({ statusCode: 409, statusMessage: 'A fila está cheia.' })
    result = enqueuePlaylist(s, preview.tracks, Date.now(), {
      guest: currentAccess.guest,
      playlist: preview.playlist,
    })
    startNext(s)
  })
  return { ...result, revision: state.revision }
})
