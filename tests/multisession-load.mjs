import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import http from 'node:http'
import { startFixture, client } from './helpers/server.mjs'

function connect(base, partyId, cookie, origin) {
  return new Promise((resolve, reject) => {
    const req = http.get(base + '/ws?festa=' + partyId, {
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        Cookie: cookie,
        Origin: origin,
      },
    })
    req.setTimeout(15000, () => req.destroy(new Error('WebSocket timeout')))
    req.once('upgrade', (res, socket) => {
      socket.on('error', () => {})
      socket.on('data', () => {})
      socket.setTimeout(0)
      resolve(socket)
    })
    req.once('response', (res) => {
      res.resume()
      reject(new Error('WebSocket HTTP ' + res.statusCode))
    })
    req.once('error', reject)
  })
}
test(
  '10 festas e 200 convidados: acesso e WebSockets em duas instâncias',
  { timeout: 120000 },
  async (t) => {
    const first = await startFixture(3223, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3223',
    })
    const second = await startFixture(3224, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: first.base,
      NUXT_MONGODB_DATABASE: first.databaseName,
    })
    const sockets = []
    t.after(async () => {
      for (const socket of sockets) socket.destroy()
      await second.close()
      await first.close()
    })
    const parties = []
    for (let i = 0; i < 10; i++) {
      const host = client(first.base)
      await host.request('/api/parties')
      const result = await host.request('/api/parties', {
        name: 'Carga ' + i,
        pin: '123456',
        idempotencyKey: randomUUID(),
      })
      assert.equal(result.status, 201, JSON.stringify(result.data))
      const prefix = '/api/f/' + result.data.party.id
      const invite = await host.request(prefix + '/network/invite')
      parties.push({
        host,
        prefix,
        id: result.data.party.id,
        token: new URLSearchParams(new URL(invite.data.url).hash.slice(1)).get('convite'),
      })
    }
    const latencies = []
    const started = performance.now()
    await Promise.all(
      parties.map(async (party) => {
        await Promise.all(
          Array.from({ length: 20 }, async (_, i) => {
            const base = i % 2 ? first.base : second.base,
              guest = client(base),
              start = performance.now()
            const access = await guest.request(party.prefix + '/access', { token: party.token })
            assert.equal(access.status, 200, JSON.stringify(access.data))
            const entered = await guest.request(party.prefix + '/guest', { name: 'Convidado ' + i })
            assert.equal(entered.status, 200, JSON.stringify(entered.data))
            const state = await guest.request(party.prefix + '/state')
            assert.equal(state.status, 200)
            assert.equal(state.data.party.id, party.id)
            sockets.push(await connect(base, party.id, guest.cookies(), first.base))
            latencies.push(performance.now() - start)
          }),
        )
      }),
    )
    assert.equal(sockets.length, 200)
    for (const party of parties) {
      const state = await party.host.request(party.prefix + '/state')
      assert.equal(state.data.guests.length, 20)
      assert.equal(state.data.queue.length, 0)
    }
    latencies.sort((a, b) => a - b)
    console.log(
      JSON.stringify({
        parties: 10,
        guests: 200,
        websockets: sockets.length,
        totalMs: Math.round(performance.now() - started),
        entryP95Ms: Math.round(latencies[Math.ceil(latencies.length * 0.95) - 1]),
      }),
    )
  },
)
