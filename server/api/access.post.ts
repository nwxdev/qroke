import { EncryptedStore } from '../core/shared-store'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { rateLimit } from '../core/connections'
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!(await rateLimit(config.dragonflyUrl, 'entry:' + requestIp(event), 10)))
    throw createError({
      statusCode: 429,
      statusMessage: 'Aguarde um minuto antes de tentar novamente.',
    })
  const input = await readValidatedBody(
    event,
    z.object({
      pin: z.string().max(8).optional(),
      token: z.string().max(100).optional(),
      partyId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]{1,64}$/)
        .optional(),
    }).parse,
  )
  const partyId =
    input.partyId || (input.pin ? event.context.qrokeAccess?.partyId : undefined) || config.partyId
  const database = await openParty(config.organizationId, partyId)
  let access: Access
  if (input.pin) {
    const expected = Buffer.from(String(config.hostPin)),
      actual = Buffer.from(input.pin)
    if (
      expected.length < 4 ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      throw createError({ statusCode: 401, statusMessage: 'PIN incorreto.' })
    await database.state()
    const store = new EncryptedStore<{ token: string; expires: number }>(
      database.db,
      database.scope,
      'invite',
      config.encryptionKey,
    )
    const current = await store.get('current')
    if (!current || !(await database.acceptInvite(current.token))) {
      const token = await database.rotateInvite()
      await store.set('current', { token, expires: Date.now() + 86400000 })
    }
    access = {
      organizationId: config.organizationId,
      partyId,
      role: 'owner',
      version: 0,
      expires: Date.now() + 86400000,
    }
  } else {
    const invite = input.token && (await database.acceptInvite(input.token))
    if (!invite)
      throw createError({
        statusCode: 401,
        statusMessage: 'Convite inválido ou expirado. Peça um novo ao anfitrião.',
      })
    access = {
      organizationId: config.organizationId,
      partyId,
      role: 'guest',
      version: invite.version,
      expires: invite.expiresAt,
    }
  }
  setCookie(event, 'qroke_access', signAccess(access), {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(),
    path: '/',
    maxAge: Math.max(0, Math.floor((access.expires - Date.now()) / 1000)),
  })
  return { role: access.role, partyId }
})
