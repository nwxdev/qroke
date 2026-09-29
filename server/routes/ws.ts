import type { Peer } from 'crossws'
import { dragonflySubscription, rateLimit } from '../core/connections'
const peers = new Map<string, { peer: Peer; scope: string; token?: string }>()
let subscribed: Promise<unknown> | undefined
async function subscribe() {
  if (!subscribed)
    subscribed = (async () => {
      const client = await dragonflySubscription(useRuntimeConfig().dragonflyUrl)
      const prefix = 'qroke:events:' + useRuntimeConfig().mongodbDatabase + ':'
      await client.pSubscribe(prefix + '*', (_message, channel) => {
        const scope = channel.slice(prefix.length)
        for (const entry of peers.values())
          if (entry.scope === scope) {
            try {
              entry.peer.send(JSON.stringify({ type: 'changed' }))
            } catch {}
          }
      })
    })().catch((error) => {
      subscribed = undefined
      throw error
    })
  await subscribed
}
const timer = setInterval(async () => {
  for (const entry of peers.values()) {
    try {
      if (useRuntimeConfig().accessRequired && !(await validateAccess(entry.token))) {
        entry.peer.close(1008, 'Convite expirado.')
        peers.delete(entry.peer.id)
      } else entry.peer.send(JSON.stringify({ type: 'heartbeat' }))
    } catch {
      entry.peer.close(1013, 'Reconecte em instantes.')
    }
  }
}, 25000)
timer.unref()
export default defineWebSocketHandler({
  async upgrade(request) {
    const config = useRuntimeConfig()
    const origin = request.headers.get('origin')
    if (config.accessRequired && origin !== requestOrigin())
      return new Response('Origem inválida.', { status: 403 })
    const token = request.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('qroke_access='))
      ?.slice(13)
    const authenticated = await validateAccess(token)
    if (config.accessRequired && !authenticated)
      return new Response('Convite necessário.', { status: 401 })
    if (peers.size >= 5000) return new Response('Servidor ocupado.', { status: 503 })
    const ip = config.trustProxy ? request.headers.get('x-forwarded-for') || 'unknown' : 'local'
    if (!(await rateLimit(config.dragonflyUrl, 'ws:' + ip, 120)))
      return new Response('Muitas conexões.', { status: 429 })
    request.context.scope =
      authenticated?.database.scope || config.organizationId + ':' + config.partyId
    request.context.token = token
    await subscribe()
  },
  open(peer) {
    peers.set(peer.id, {
      peer,
      scope: String(peer.context.scope),
      token: peer.context.token as string | undefined,
    })
    peer.send(JSON.stringify({ type: 'changed' }))
  },
  close(peer) {
    peers.delete(peer.id)
  },
  error(peer) {
    peers.delete(peer.id)
  },
})
