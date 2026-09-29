import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const access = await playlistAccess(event)
  await playlistLimit(event, access.owner)
  const input = await readValidatedBody(
    event,
    z.object({
      input: z.string().min(1).max(2048),
      personal: z.boolean().default(false),
      pageToken: z.string().max(1024).default(''),
      karaoke: z.boolean().default(false),
    }).parse,
  )
  const account = input.personal ? await youtubeAccount(event) : undefined
  if (input.personal && !account)
    throw createError({ statusCode: 409, statusMessage: 'Conecte sua conta do YouTube.' })
  const result = await youtubeResult(async () =>
    (await youtube(event)).preview(
      access.owner,
      input.input,
      account,
      input.pageToken,
      input.karaoke,
    ),
  )
  await recheckPlaylistAccess(event, access.owner, account)
  return result
})
