import test from 'node:test'
import assert from 'node:assert/strict'
import { startFixture, client } from './helpers/server.mjs'
test('participantes: votos simultâneos, identidade, dedupe global, anterior e persistência', async (t) => {
  const fixture = await startFixture(3191)
  t.after(() => fixture.close())
  const a = client(fixture.base),
    b = client(fixture.base),
    host = client(fixture.base),
    anonymous = client(fixture.base)
  const ana = (await a.request('/api/guest', { name: 'Ana' })).data
  await b.request('/api/guest', { name: 'Bia' })
  const tracks = (await a.request('/api/search?q=Faixa&source=local')).data.tracks
  for (const item of tracks.slice(0, 4)) await a.request('/api/queue', item)
  await b.request('/api/queue', tracks[0])
  let state = (await a.request('/api/state')).data
  assert.equal(state.queue.length, 4)
  assert.equal(state.guests.length, 2)
  assert.equal((await anonymous.request('/api/guest/name', { name: 'Intruso' })).status, 401)
  const third = state.queue[2].queueId,
    fourth = state.queue[3].queueId
  assert.equal(
    (await anonymous.request('/api/queue/' + third + '/vote', { voted: true })).status,
    401,
  )
  const results = await Promise.all([
    a.request('/api/queue/' + third + '/vote', { voted: true }),
    b.request('/api/queue/' + fourth + '/vote', { voted: true }),
  ])
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200],
  )
  state = (await a.request('/api/state')).data
  assert.equal(state.queue[0].queueId, third)
  assert.equal(state.queue[1].queueId, fourth)
  assert.equal((await b.request('/api/queue/' + third + '/vote', { voted: true })).status, 409)
  await a.request('/api/guest/name', { name: 'Bia', guestId: 'forged' })
  assert.equal((await a.request('/api/session')).data.guest.name, 'Bia (2)')
  assert.equal((await b.request('/api/session')).data.guest.name, 'Bia')
  assert.ok(
    (await a.request('/api/state')).data.queue.every(
      (track) => track.guestId === ana.id && track.guestName === 'Bia (2)',
    ),
  )
  await fixture.restart()
  assert.deepEqual((await a.request('/api/session')).data.votedQueueIds, [third])
  assert.equal((await a.request('/api/state')).data.queue[0].votes, 1)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  const device = (await host.request('/api/device', { label: 'TV' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  state = (await a.request('/api/state')).data
  assert.equal(state.current.queueId, third)
  assert.deepEqual((await a.request('/api/session')).data.votedQueueIds, [])
  assert.equal((await a.request('/api/control', { action: 'previous' })).status, 401)
  assert.equal((await host.request('/api/control', { action: 'previous' })).status, 409)
  await host.request('/api/control', { action: 'skip' })
  const interrupted = (await a.request('/api/state')).data.current
  assert.equal(interrupted.queueId, fourth)
  await a.request('/api/queue', tracks[2])
  assert.equal((await host.request('/api/control', { action: 'previous' })).status, 200)
  state = (await a.request('/api/state')).data
  assert.equal(state.current.id, tracks[2].id)
  assert.notEqual(state.current.queueId, third)
  assert.ok(state.queue.every((item) => item.id !== state.current.id))
  assert.equal(state.queue[0].id, interrupted.id)
  assert.notEqual(state.queue[0].queueId, fourth)
  const delayed = await host.request(
    '/api/player',
    { action: 'ended', queueId: interrupted.queueId },
    'POST',
    { 'x-qroke-device-key': device.token },
  )
  assert.equal(delayed.data.stale, true)
  assert.equal((await a.request('/api/state')).data.current.queueId, state.current.queueId)
  const target = state.queue.at(-1).queueId
  assert.equal((await b.request('/api/queue/' + target + '/vote', { voted: true })).status, 409)
  await host.request('/api/control', { action: 'reset-order' })
  assert.equal((await b.request('/api/queue/' + target + '/vote', { voted: true })).status, 200)
})
