import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const guest = requireGuest(event)
  const input = await readValidatedBody(event, z.object({ name: z.string().max(100) }).parse)
  try {
    return party().renameGuest(guest.id, input.name)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
})
