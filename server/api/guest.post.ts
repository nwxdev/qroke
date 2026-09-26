import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, z.object({ name: z.string().max(100) }).parse)
  const existing = party().guest(getCookie(event, 'qroke_guest'))
  if (existing) return existing
  try {
    const { token, ...guest } = party().createGuest(input.name)
    setCookie(event, 'qroke_guest', token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 365 })
    return guest
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
})
