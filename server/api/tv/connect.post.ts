import { z } from 'zod'
import { rateLimit } from '../../core/connections'
import { TvCodes } from '../../core/tv-codes'
import { assignPlayer } from '../../core/handoff'
import { startNext } from '../../core/playback'
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  setHeader(event, 'cache-control', 'no-store')
  if (!(await rateLimit(config.dragonflyUrl, 'tv-connect:' + requestIp(event), 6)))
    throw createError({
      statusCode: 429,
      statusMessage: 'Aguarde um minuto antes de tentar outro código.',
    })
  const input = await readValidatedBody(
    event,
    z.object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-HJ-NP-Z2-9]{4}$/),
      info: deviceInfoSchema.optional(),
    }).parse,
  )
  const value = await new TvCodes(config.dragonflyUrl, config.mongodbDatabase).take(input.code)
  const invalid = () =>
    createError({
      statusCode: 401,
      statusMessage: 'Código inválido, expirado ou já usado. Gere outro no celular.',
    })
  if (!value || value.organizationId !== config.organizationId) throw invalid()
  const database = await openParty(value.organizationId, value.partyId)
  await database.assertActive()
  const invite = await database.inviteVersion()
  if (!invite || invite.version !== value.version || invite.expiresAt <= Date.now()) throw invalid()
  event.context.qrokeParty = database
  event.context.qrokeScoped = true
  await grantMembership(event, 'guest', invite.version, invite.expiresAt)
  const device = await database.createDevice(
    'TV da festa',
    input.info ? JSON.parse(storedDeviceInfo(input.info)) : {},
  )
  await touchPresence(database, 'device', device.id)
  await database.mutate(async (state) => {
    // Invitation rotation revokes an outstanding pairing just as it revokes a QR invitation.
    const current = await database.inviteVersion()
    if (!current || current.version !== value.version || current.expiresAt <= Date.now())
      throw invalid()
    assignPlayer(state, device.id)
    startNext(state)
  })
  void continueParty(event)
  return { partyId: value.partyId, device, url: '/f/' + value.partyId + '/player?tv=1' }
})
