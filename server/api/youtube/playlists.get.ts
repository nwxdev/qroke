import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const access = playlistAccess(event)
  playlistLimit(event, access.owner)
  const query = await getValidatedQuery(
    event,
    z.object({ pageToken: z.string().max(1024).default('') }).parse,
  )
  const id = youtubeAccount(event)
  if (!id) throw createError({ statusCode: 409, statusMessage: 'Conecte sua conta do YouTube.' })
  const result = await youtubeResult(() => youtube().list(id, query.pageToken))
  recheckPlaylistAccess(event, access.owner, id)
  return result
})
