import { z } from 'zod'
import { enqueuePlaylist } from '../../core/youtube-playlists'
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const input = await readValidatedBody(
    event,
    z.object({ ticket: z.string().min(20).max(100) }).parse,
  )
  requireAdmin(event)
  if (party().state().queue.length > 1800)
    throw createError({
      statusCode: 409,
      statusMessage: 'A fila está cheia. Aguarde algumas músicas antes de importar outro lote.',
    })
  const preview = await youtubeResult(() =>
    youtube().consume(input.ticket, getCookie(event, 'qroke_admin')!, youtubeAccount(event)),
  )
  requireAdmin(event)
  let result = { added: 0, duplicates: 0 }
  const state = party().mutate((s) => {
    result = enqueuePlaylist(s, preview.tracks)
    startNext(s)
  })
  return { ...result, revision: state.revision }
})
