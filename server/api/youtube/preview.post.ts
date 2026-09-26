import { z } from 'zod'
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const input = await readValidatedBody(
    event,
    z.object({
      input: z.string().min(1).max(2048),
      personal: z.boolean().default(false),
      pageToken: z.string().max(1024).default(''),
      karaoke: z.boolean().default(false),
    }).parse,
  )
  const account = input.personal ? youtubeAccount(event) : undefined
  if (input.personal && !account)
    throw createError({ statusCode: 409, statusMessage: 'Conecte sua conta do YouTube.' })
  const result = await youtubeResult(() =>
    youtube().preview(
      getCookie(event, 'qroke_admin')!,
      input.input,
      account,
      input.pageToken,
      input.karaoke,
    ),
  )
  requireAdmin(event)
  return result
})
