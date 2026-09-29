import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const guest = await requireGuest(event)
  const input = await readValidatedBody(event, z.object({ name: z.string().max(100) }).parse)
  try {
    return await party(event).renameGuest(guest.id, input.name)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
})
