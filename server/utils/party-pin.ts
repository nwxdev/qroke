import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { checkPin } from '../core/party-lifecycle'
import { hashToken } from '../core/mongo-database'
import { rateLimit } from '../core/connections'
export async function verifyPartyPin(event: H3Event, pin: string) {
  const config = useRuntimeConfig(),
    database = party(event),
    details = await database.details()
  await database.assertActive()
  const modern = !!details.pinHash
  const identity = modern ? browserIdentity(event) || requestIp(event) : requestIp(event)
  const entry = event.path.split('?')[0]?.endsWith('/access')
  const key = modern
    ? 'pin:' + database.scope + ':' + hashToken(identity)
    : (entry ? 'entry-pin:' : 'pin:') + identity
  const cap = modern ? 8 : entry ? 10 : 5
  if (
    !(await rateLimit(config.dragonflyUrl, key, cap)) ||
    (modern &&
      (!(await rateLimit(config.dragonflyUrl, 'pin-ip:' + requestIp(event), 120)) ||
        !(await rateLimit(config.dragonflyUrl, 'pin-party:' + database.scope, 30))))
  )
    throw createError({
      statusCode: 429,
      statusMessage: 'Aguarde um minuto antes de tentar novamente.',
    })
  const expected = String(config.hostPin)
  const valid = details.pinHash
    ? /^\d{6}$/.test(pin) && (await checkPin(pin, details.pinHash))
    : /^\d{4,8}$/.test(expected) &&
      Buffer.byteLength(pin) === Buffer.byteLength(expected) &&
      timingSafeEqual(Buffer.from(pin), Buffer.from(expected))
  if (!valid) throw createError({ statusCode: 401, statusMessage: 'PIN incorreto.' })
}
