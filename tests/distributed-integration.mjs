import { randomUUID } from 'node:crypto'
import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, client } from './helpers/server.mjs'
test(
  'duas instâncias: sessões, OAuth, cache, convites, isolamento e persistência',
  { timeout: 60000 },
  async (t) => {
    const env = {
      NUXT_HOST_PIN: '58492177',
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3183',
      NUXT_YOUTUBE_API_KEY: 'fixture-key',
      NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
      NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
      NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3183/api/youtube/callback',
      NODE_OPTIONS: '--import=' + new URL('./helpers/youtube-fetch.mjs', import.meta.url).pathname,
    }
    const first = await startFixture(3183, env)
    const second = await startFixture(3184, { ...env, NUXT_MONGODB_DATABASE: first.databaseName })
    t.after(async () => {
      await second.close()
      await first.close()
    })
    const host = client(first.base),
      stranger = client(second.base)
    assert.equal((await stranger.request('/api/state')).status, 401)
    const entry = await host.request('/api/access', { pin: '58492177' })
    assert.equal(entry.status, 200, JSON.stringify(entry.data) + first.logs())
    assert.equal(
      (await host.request('/api/auth', { action: 'login', pin: '58492177' })).status,
      200,
    )
    const host2 = client(second.base, host.cookies())
    assert.equal((await host2.request('/api/session')).data.admin, true)
    const invite = (await host2.request('/api/network/invite')).data
    const hash = new URLSearchParams(new URL(invite.url).hash.slice(1))
    assert.equal(
      (
        await stranger.request('/api/access', {
          token: hash.get('convite'),
          partyId: hash.get('festa'),
        })
      ).status,
      200,
    )
    assert.equal((await stranger.request('/api/guest', { name: 'Ana' })).status, 200)
    const guest1 = client(first.base, stranger.cookies())
    assert.equal((await guest1.request('/api/session')).data.guest.name, 'Ana')
    assert.equal(
      (await stranger.request('/api/auth', { action: 'login', pin: '58492177' })).status,
      403,
    )
    const preview = await guest1.request('/api/youtube/preview', { input: 'PLabcdefghijk' })
    assert.equal(preview.status, 200, JSON.stringify(preview.data))
    assert.equal(
      (await stranger.request('/api/youtube/import', { ticket: preview.data.ticket })).data.added,
      2,
    )
    assert.equal((await host.request('/api/state')).data.queue.length, 2)
    const flow = await guest1.request('/api/youtube/connect', {})
    const callbackClient = client(second.base, guest1.cookies())
    assert.equal(
      (
        await callbackClient.request(
          '/api/youtube/callback?state=' +
            new URL(flow.data.url).searchParams.get('state') +
            '&code=fixture',
        )
      ).status,
      200,
    )
    const connectedClient = client(first.base, callbackClient.cookies())
    assert.equal((await connectedClient.request('/api/youtube/status')).data.connected, true)
    await first.restart()
    assert.equal((await connectedClient.request('/api/youtube/status')).data.connected, true)
    const newParty = await host2.request('/api/parties', {
      name: 'Outra festa',
      pin: '584921',
      idempotencyKey: randomUUID(),
    })
    assert.equal(newParty.status, 201)
    const prefix = '/api/f/' + newParty.data.party.id
    await host2.request(prefix + '/auth', { action: 'logout' })
    const isolated = client(second.base)
    assert.equal((await isolated.request(prefix + '/access', { pin: '584921' })).status, 200)
    assert.equal((await isolated.request(prefix + '/state')).data.queue.length, 0)
    assert.equal((await isolated.request(prefix + '/session')).data.guest, null)
    const otherInvite = (await isolated.request(prefix + '/network/invite')).data
    const otherHash = new URLSearchParams(new URL(otherInvite.url).hash.slice(1))
    const invitedHost = client(first.base)
    assert.equal(
      (await invitedHost.request(prefix + '/access', { token: otherHash.get('convite') })).status,
      200,
    )
    const elevated = await invitedHost.request(prefix + '/access', { pin: '584921' })
    assert.equal(elevated.status, 200)
    assert.equal(elevated.data.partyId, newParty.data.party.id)
    assert.equal(
      (await invitedHost.request(prefix + '/auth', { action: 'login', pin: '584921' })).status,
      200,
    )
    const invitedHost2 = client(second.base, invitedHost.cookies())
    assert.equal((await invitedHost2.request(prefix + '/session')).data.admin, true)
    assert.equal((await invitedHost2.request(prefix + '/state')).data.queue.length, 0)
    assert.equal((await host2.request('/api/state')).data.queue.length, 2)
    assert.equal((await host2.request('/api/invite', {})).status, 200)
    assert.equal((await stranger.request('/api/state')).status, 401)
    assert.equal((await guest1.request('/api/state')).status, 401)
    assert.equal((await host2.request('/api/state')).status, 200)
  },
)
