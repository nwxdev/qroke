import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, client } from './helpers/server.mjs'
test('provider routes, scoped storage upgrade and acknowledged player transfer', async (t) => {
  const fixture = await startFixture(3231)
  t.after(() => fixture.close())
  const host = client(fixture.base)
  const created = await host.request('/api/parties', {
    name: 'Media channels',
    pin: '123456',
    idempotencyKey: crypto.randomUUID(),
  })
  assert.equal(created.status, 201)
  const scope = '/api/f/' + created.data.party.id
  assert.equal((await client(fixture.base).request(scope + '/media/providers')).status, 401)
  const providers = (await host.request(scope + '/media/providers')).data.providers
  assert.deepEqual(
    providers.filter((p) => p.enabled).map((p) => p.id),
    ['youtube', 'local'],
  )
  assert.equal((await host.request(scope + '/media/spotify/search?q=teste')).status, 501)
  assert.equal((await host.request(scope + '/media/deezer/stream/1')).status, 501)
  await host.request(scope + '/guest', { name: 'Host' })
  const tracks = (await host.request(scope + '/media/local/search?q=Faixa')).data.tracks
  assert.equal(tracks.length, 7)
  assert.equal(tracks[0].media.playback.kind, 'audio-file')
  const media = await fetch(fixture.base + scope + '/media/local/stream/' + tracks[0].id, {
    headers: { cookie: host.cookies(), Range: 'bytes=0-31' },
  })
  assert.equal(media.status, 206)
  assert.equal((await media.arrayBuffer()).byteLength, 32)
  const a = (await host.request(scope + '/device', { label: 'A' })).data
  const b = (await host.request(scope + '/device', { label: 'B' })).data
  await host.request(scope + '/control', { action: 'assign', deviceId: a.id })
  await host.request(scope + '/queue', { source: 'local', id: tracks[0].id })
  await host.request(scope + '/control', { action: 'assign', deviceId: b.id })
  const state = (await host.request(scope + '/state')).data
  assert.equal(state.schemaVersion, 2)
  assert.equal(state.current.media.provider, 'local')
  assert(state.playerReadyAt > Date.now())
  const input = {
    handoffId: state.playerHandoff.id,
    queueId: state.current.queueId,
    position: 1.25,
  }
  assert.equal((await host.request(scope + '/player/release', input)).status, 401)
  assert.equal(
    (
      await host.request(scope + '/player/release', input, 'POST', {
        'x-qroke-device-key': b.token,
      })
    ).data.released,
    false,
  )
  assert.equal(
    (
      await host.request(scope + '/player/release', input, 'POST', {
        'x-qroke-device-key': a.token,
      })
    ).data.released,
    true,
  )
  const after = (await host.request(scope + '/state')).data
  assert(after.playerReadyAt <= Date.now())
  assert.equal(after.position, 1.25)
  assert.equal(after.playerId, b.id)
  assert.equal(
    (
      await host.request(scope + '/player/release', { ...input, position: 0 }, 'POST', {
        'x-qroke-device-key': a.token,
      })
    ).data.released,
    false,
  )
  assert.equal((await host.request(scope + '/state')).data.position, 1.25)
  assert.equal((await host.request(scope + '/media/youtube/status')).status, 200)
})
