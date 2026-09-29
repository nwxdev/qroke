import { z } from 'zod'
import { rateLimit } from '../core/connections'
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!(await rateLimit(config.dragonflyUrl, 'entry:' + requestIp(event), 600)))
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
        .regex(/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63}$/)
        .optional(),
    }).parse,
  )
  const partyId = event.context.qrokeScoped
    ? party(event).partyId
    : input.partyId ||
      (input.pin ? event.context.qrokeAccess?.partyId : undefined) ||
      config.partyId
  if (event.context.qrokeScoped && input.partyId && input.partyId !== partyId)
    throw createError({ statusCode: 400, statusMessage: 'Convite de outra festa.' })
  const database = await openParty(config.organizationId, partyId)
  event.context.qrokeParty = database
  await database.assertActive()
  const details = await database.details(),
    info = await database.info()
  // New parties always use scoped browser memberships, including old bookmarked entry URLs.
  if (details.pinHash) event.context.qrokeScoped = true
  let access: Access
  if (input.pin) {
    await verifyPartyPin(event, input.pin)
    await ensurePartyInvite(event)
    access = {
      organizationId: config.organizationId,
      partyId,
      role: 'owner',
      version: 0,
      expires: info.expiresAt || Date.now() + 86400000,
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
  if (event.context.qrokeScoped) {
    await grantMembership(event, access.role, access.version, access.expires)
  } else {
    setCookie(event, 'qroke_access', signAccess(access), {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie(),
      path: '/',
      maxAge: Math.max(0, Math.floor((access.expires - Date.now()) / 1000)),
    })
  }
  return {
    role: event.context.qrokeAccess?.role || access.role,
    partyId,
    scoped: !!event.context.qrokeScoped,
  }
})
