import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from './helpers/server.mjs'
import { openFixtureDatabase } from './helpers/database.mjs'

test(
  'multissessão: isolamento, PIN, idempotência, Google, revogação e encerramento em duas instâncias',
  { timeout: 90000 },
  async (t) => {
    const env = {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3220',
      NUXT_YOUTUBE_API_KEY: 'fixture-key',
      NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
      NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
      NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3220/api/youtube/callback',
      NODE_OPTIONS: '--import=' + new URL('./helpers/youtube-fetch.mjs', import.meta.url).pathname,
    }
    const first = await startFixture(3220, env)
    const second = await startFixture(3221, { ...env, NUXT_MONGODB_DATABASE: first.databaseName })
    const database = await openFixtureDatabase(first.dir)
    t.after(async () => {
      await database.close()
      await second.close()
      await first.close()
    })
    const host = client(first.base),
      guest = client(second.base),
      outsider = client(first.base)
    assert.equal((await host.request('/api/parties')).status, 200)
    assert.match(host.cookies(), /qroke_browser=/)
    const body = { name: 'Festa de sexta', pin: '123456', idempotencyKey: randomUUID() }
    const [created, concurrent] = await Promise.all([
      host.request('/api/parties', body),
      host.request('/api/parties', body),
    ])
    assert.equal(concurrent.data.party.id, created.data.party.id)
    assert.equal(created.status, 201, JSON.stringify(created.data) + first.logs())
    const a = created.data.party,
      pa = '/api/f/' + a.id
    assert.equal(a.expiresAt - a.createdAt, 86400000)
    assert.equal((await host.request('/api/parties', body)).data.party.id, a.id)
    const [retry1, retry2] = await Promise.all([
      host.request('/api/parties', body),
      host.request('/api/parties', body),
    ])
    assert.equal(retry1.data.party.id, a.id)
    assert.equal(retry2.data.party.id, a.id)
    const other = await host.request('/api/parties', {
      ...body,
      pin: '654321',
      idempotencyKey: randomUUID(),
    })
    assert.equal(other.status, 201, JSON.stringify(other.data))
    const b = other.data.party,
      pb = '/api/f/' + b.id
    assert.notEqual(a.id, b.id)
    const host2 = client(second.base, host.cookies())
    for (const base of [pa, pb]) {
      assert.equal((await host2.request(base + '/session')).data.admin, true)
      assert.equal((await outsider.request(base + '/state')).status, 401)
    }
    assert.equal((await host.request('/api/state')).status, 401)
    assert.equal((await host.request('/api/parties')).data.parties.length, 2)
    const row = await database.db.collection('parties').findOne({ _id: 'nwx:' + a.id })
    assert.match(row.pinHash, /^scrypt\$/)
    assert.ok(!row.pinHash.includes(body.pin))
    const ia = (await host.request(pa + '/network/invite')).data.url
    const ib = (await host.request(pb + '/network/invite')).data.url
    assert.match(ia, new RegExp('/f/' + a.id + '#convite='))
    const token = (url) => new URLSearchParams(new URL(url).hash.slice(1)).get('convite')
    assert.equal((await guest.request(pa + '/access', { token: token(ia) })).status, 200)
    assert.equal((await guest.request(pa + '/guest', { name: 'Ana da festa A' })).status, 200)
    assert.equal((await guest.request(pb + '/state')).status, 401)
    assert.equal((await guest.request(pb + '/access', { token: token(ia) })).status, 401)
    assert.equal((await guest.request(pa + '/access', { pin: '654321' })).status, 401)
    assert.equal((await guest.request('/api/access', { partyId: a.id, pin: '4321' })).status, 401)
    const guestFirst = client(first.base, guest.cookies())
    assert.equal((await guestFirst.request(pa + '/session')).data.guest.name, 'Ana da festa A')
    assert.equal(
      (await guestFirst.request(pa + '/control', { action: 'mode', mode: 'music' })).status,
      403,
    )
    await host.request(pa + '/guest', { name: 'Dono A' })
    await host.request(pb + '/guest', { name: 'Dono B' })
    assert.equal((await host2.request(pa + '/session')).data.guest.name, 'Dono A')
    assert.equal((await host2.request(pb + '/session')).data.guest.name, 'Dono B')
    const preview = await guestFirst.request(pa + '/youtube/preview', { input: 'PLabcdefghijk' })
    assert.equal(preview.status, 200, JSON.stringify(preview.data))
    assert.equal(
      (await guest.request(pa + '/youtube/import', { ticket: preview.data.ticket })).data.added,
      2,
    )
    assert.equal((await host.request(pa + '/state')).data.queue.length, 2)
    assert.equal((await host.request(pb + '/state')).data.queue.length, 0)

    // Two pending Google connections share a browser without replacing each other's binding.
    const fa = await host.request(pa + '/youtube/connect', {}),
      fb = await host.request(pb + '/youtube/connect', {})
    assert.equal(fa.status, 200, JSON.stringify(fa.data))
    assert.equal(fb.status, 200, JSON.stringify(fb.data))
    const callback = (url) =>
      '/api/youtube/callback?state=' + new URL(url).searchParams.get('state') + '&code=fixture'
    assert.equal((await outsider.request(callback(fa.data.url))).status, 403)
    assert.equal((await host2.request(callback(fb.data.url))).status, 200)
    assert.equal((await host2.request(callback(fa.data.url))).status, 200)
    assert.equal((await host.request(pa + '/youtube/status')).data.connected, true)
    assert.equal((await host.request(pb + '/youtube/status')).data.connected, true)
    await host.request(pa + '/youtube/disconnect', {})
    assert.equal((await host.request(pa + '/youtube/status')).data.connected, false)
    assert.equal((await host.request(pb + '/youtube/status')).data.connected, true)
    await first.restart()
    assert.equal((await host.request(pa + '/session')).data.guest.name, 'Dono A')
    assert.equal((await host.request(pb + '/youtube/status')).data.connected, true)

    const before = (await host.request(pa + '/party')).data.party.expiresAt
    assert.equal((await host.request(pa + '/invite', {})).status, 200)
    assert.equal((await guest.request(pa + '/state')).status, 401)
    assert.equal((await guest.request('/api/parties')).data.parties.length, 0)
    assert.equal((await host.request(pa + '/party')).data.party.expiresAt, before)
    const closed = await host.request(pa + '/party/close', {})
    assert.equal(closed.status, 200, JSON.stringify(closed.data))
    assert.equal((await host2.request(pa + '/state')).status, 410)
    assert.equal((await host2.request(pa + '/access', { pin: '123456' })).status, 410)
    assert.equal((await host2.request(pa + '/invite', {})).status, 410)
    assert.equal((await host2.request(pb + '/state')).status, 200)
    assert.deepEqual(
      (await host.request('/api/parties')).data.parties.map((p) => p.id),
      [b.id],
    )
    const late = await host.request(pb + '/youtube/connect', {})
    assert.equal(late.status, 200)
    await database.db
      .collection('parties')
      .updateOne({ _id: 'nwx:' + b.id }, { $set: { expiresAt: new Date(Date.now() - 1) } })
    assert.equal((await host.request(pb + '/state')).status, 410)
    assert.equal((await host.request(pb + '/access', { pin: '654321' })).status, 410)
    assert.equal((await host.request(callback(late.data.url))).status, 410)
    assert.equal((await host.request('/api/parties')).data.parties.length, 0)
    assert.equal((await host.request(pb + '/party')).data.party.status, 'expired')
    await first.restart()
    assert.equal((await host.request(pb + '/state')).status, 410)
    assert.ok(!first.logs().includes(body.pin))
    assert.ok(!first.logs().includes('fixture-private-access'))
  },
)
