import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const access = await playlistAccess(event)
  await playlistLimit(event, access.owner)
  const query = await getValidatedQuery(
    event,
    z.object({ pageToken: z.string().max(1024).default('') }).parse,
  )
  const id = await youtubeAccount(event)
  if (!id) throw createError({ statusCode: 409, statusMessage: 'Conecte sua conta do YouTube.' })
  const result = await youtubeResult(async () => (await youtube(event)).list(id, query.pageToken))
  await recheckPlaylistAccess(event, access.owner, id)
  return result
})
