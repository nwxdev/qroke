import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const guest = requireGuest(event)
  const id = getRouterParam(event, 'id')!
  const input = await readValidatedBody(
    event,
    z.union([
      z.object({ value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) }),
      z.object({ voted: z.boolean() }),
    ]).parse,
  )
  try {
    return {
      revision: party().vote(id, guest.id, 'value' in input ? input.value : input.voted).revision,
    }
  } catch (error) {
    throw createError({ statusCode: 409, statusMessage: (error as Error).message })
  }
})
