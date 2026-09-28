import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture, client } from './helpers/server.mjs'

test('player: concorrência, recusas persistentes, volume e revogação de aparelho', async (t) => {
  const fixture = await startFixture(3189)
  const db = new Database(join(fixture.dir, 'party.sqlite'))
  t.after(async () => {
    db.close()
    await fixture.close()
  })
  const host = client(fixture.base),
    guest = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  await guest.request('/api/guest', { name: 'Convidado' })
  const device = (await host.request('/api/device', { label: 'TV' })).data
  const other = (await host.request('/api/device', { label: 'Celular' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  const state = () => JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  const make = (n) => ({
    id: String(n).padStart(11, '0'),
    queueId: randomUUID(),
    source: 'youtube',
    title: 'Faixa ' + n,
    artist: 'Teste',
    duration: 30,
    thumbnail: '',
    karaoke: false,
    guestId: 'test',
    guestName: 'Ana',
    origin: 'human',
    enqueuedAt: n,
    round: 0,
    manualOrder: null,
  })
  const first = make(1),
    second = make(2),
    third = make(3),
    fourth = make(4),
    fifth = make(5)
  const seed = state()
  Object.assign(seed, { current: first, queue: [second, third, fourth, fifth], paused: false })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(seed))
  const report = (action, queueId, extra = {}, token = device.token) =>
    host.request('/api/player', { action, queueId, ...extra }, 'POST', {
      'x-qroke-device-key': token,
    })
  const skips = await Promise.all(
    [1, 2].map(() => host.request('/api/control', { action: 'skip', queueId: first.queueId })),
  )
  assert.ok(skips.every((r) => r.status === 200))
  assert.equal(skips.filter((r) => r.data.stale).length, 1)
  assert.equal(state().current.queueId, second.queueId)
  assert.equal((await report('ended', first.queueId)).data.stale, true)
  await Promise.all([
    report('ended', second.queueId),
    host.request('/api/control', { action: 'skip', queueId: second.queueId }),
  ])
  assert.equal(state().current.queueId, third.queueId)
  await report('error', third.queueId, { errorCode: 150 })
  assert.equal(state().current.queueId, fourth.queueId)
  assert.equal(state().history.at(-1).errorCode, 150)
  await report('error', fourth.queueId, { errorCode: 101 })
  assert.equal(state().current.queueId, fourth.queueId)
  assert.equal(state().playbackIssue.halted, true)
  assert.equal(state().queue.length, 1)
  await report('ended', fourth.queueId)
  assert.equal(state().current.queueId, fourth.queueId)
  assert.equal((await host.request('/api/control', { action: 'pause', paused: false })).status, 409)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM youtube_blocks').get().n, 2)
  assert.equal((await guest.request('/api/queue', { id: third.id, source: 'youtube' })).status, 409)
  await host.request('/api/control', { action: 'retry', queueId: fourth.queueId })
  const retried = state().current.queueId
  assert.notEqual(retried, fourth.queueId)
  assert.equal((await report('error', fourth.queueId, { errorCode: 150 })).data.stale, true)
  await report('error', retried, { errorCode: 5 })
  assert.equal(state().current.queueId, retried)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM youtube_blocks').get().n, 2)
  assert.equal((await guest.request('/api/control', { action: 'volume', volume: 37 })).status, 401)
  assert.equal((await host.request('/api/control', { action: 'volume', volume: 101 })).status, 400)
  await host.request('/api/control', { action: 'volume', volume: 37 })
  await fixture.restart()
  assert.equal(state().volume, 37)
  assert.equal((await guest.request('/api/queue', { id: third.id, source: 'youtube' })).status, 409)
  assert.equal((await guest.request('/api/devices')).status, 401)
  await host.request('/api/control', {
    action: 'rename-device',
    deviceId: device.id,
    label: 'TV da sala',
  })
  const devices = (await host.request('/api/devices')).data.devices
  assert.equal(devices.find((d) => d.id === device.id).label, 'TV da sala')
  assert.ok(devices.every((d) => !('token' in d)))
  const before = state()
  await host.request('/api/control', { action: 'remove-device', deviceId: device.id })
  assert.equal(state().playerId, null)
  assert.equal(state().paused, true)
  assert.equal(state().current.queueId, before.current.queueId)
  assert.deepEqual(state().queue, before.queue)
  assert.equal((await report('ended', retried)).status, 401)
  const barrier = state().playerReadyAt
  await host.request('/api/control', { action: 'assign', deviceId: other.id })
  assert.equal(state().playerReadyAt, barrier)
  assert.equal((await report('progress', retried, {}, other.token)).status, 409)
})
