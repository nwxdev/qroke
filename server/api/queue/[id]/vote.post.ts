import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const guest = requireGuest(event)
  const id = getRouterParam(event, 'id')!
  const input = await readValidatedBody(event, z.object({ voted: z.boolean() }).parse)
  try {
    return { revision: party().vote(id, guest.id, input.voted).revision }
  } catch (error) {
    throw createError({ statusCode: 409, statusMessage: (error as Error).message })
  }
})
