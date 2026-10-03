import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from 'redis'
import { startFixture, client } from './helpers/server.mjs'

test(
  'TV: código curto isolado, temporário, revogável e de uso único entre instâncias',
  { timeout: 60000 },
  async (t) => {
    const first = await startFixture(3294, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_TRUST_PROXY: 'true',
    })
    const second = await startFixture(3295, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_TRUST_PROXY: 'true',
      NUXT_MONGODB_DATABASE: first.databaseName,
    })
    const redis = await createClient({
      url: process.env.QROKE_DRAGONFLY_URL || 'redis://127.0.0.1:36379',
    }).connect()
    t.after(async () => {
      await redis.quit()
      await second.close()
      await first.close()
    })
    const host = client(first.base),
      tv = client(second.base),
      otherTv = client(first.base)
    const created = await host.request('/api/parties', {
      name: 'TV pareada',
      pin: '123456',
      idempotencyKey: randomUUID(),
    })
    assert.equal(created.status, 201)
    const id = created.data.party.id,
      prefix = '/api/f/' + id
    const another = await host.request('/api/parties', {
      name: 'Outra festa',
      pin: '234567',
      idempotencyKey: randomUUID(),
    })
    assert.equal((await tv.request(prefix + '/tv-code', {})).status, 401)
    let ip = 1
    const enter = (who, code, fixedIp) =>
      who.request('/api/tv/connect', { code }, 'POST', {
        'x-forwarded-for': fixedIp || '192.0.2.' + ip++,
      })
    const issue = async () => {
      const response = await host.request(prefix + '/tv-code', {})
      assert.equal(response.status, 200, JSON.stringify(response.data) + first.logs())
      assert.match(response.data.code, /^[A-HJ-NP-Z2-9]{4}$/)
      assert.ok(response.data.expires - response.data.serverTime <= 300000)
      assert.match(response.headers.get('cache-control'), /no-store/)
      return response.data.code
    }
    const old = await issue(),
      code = await issue()
    assert.equal((await enter(tv, old)).status, 401)
    const both = await Promise.all([enter(tv, code.toLowerCase()), enter(otherTv, code)])
    assert.deepEqual(both.map((r) => r.status).sort(), [200, 401])
    const winner = both[0].status === 200 ? tv : otherTv
    const accepted = both.find((r) => r.status === 200).data
    assert.equal(accepted.partyId, id)
    assert.equal((await winner.request(prefix + '/state')).data.playerId, accepted.device.id)
    assert.equal((await winner.request('/api/f/' + another.data.party.id + '/state')).status, 401)
    assert.equal(
      (await winner.request(prefix + '/control', { action: 'volume', volume: 1 })).status,
      403,
    )
    assert.equal((await winner.request(prefix + '/tv-code', {})).status, 403)
    assert.equal((await enter(tv, code)).status, 401)
    const revoked = await issue()
    assert.equal((await host.request(prefix + '/invite', {})).status, 200)
    assert.equal((await enter(tv, revoked)).status, 401)
    const expired = await issue()
    const key =
      'qroke:tv:' +
      first.databaseName +
      ':code:' +
      createHash('sha256').update(expired).digest('hex')
    await redis.expire(key, 1)
    await new Promise((r) => setTimeout(r, 1100))
    assert.equal((await enter(tv, expired)).status, 401)
    for (let i = 0; i < 6; i++) assert.equal((await enter(tv, 'AAAA', '192.0.2.200')).status, 401)
    assert.equal((await enter(tv, 'AAAA', '192.0.2.200')).status, 429)
    const closed = await issue()
    assert.equal((await host.request(prefix + '/party/close', {})).status, 200)
    assert.equal((await enter(tv, closed)).status, 410)
  },
)
