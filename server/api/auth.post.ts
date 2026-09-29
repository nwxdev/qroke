import { z } from 'zod'
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(
    event,
    z.object({ action: z.enum(['login', 'logout', 'touch']), pin: z.string().max(8).optional() })
      .parse,
  )
  if (input.action === 'login') await login(event, input.pin || '')
  if (input.action === 'touch') await requireAdmin(event)
  if (input.action === 'logout') {
    await party(event).logout(getCookie(event, 'qroke_admin'))
    deleteCookie(event, 'qroke_admin', { path: '/' })
  }
  return { admin: input.action !== 'logout' }
})
