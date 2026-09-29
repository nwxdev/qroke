import test from 'node:test'
import assert from 'node:assert/strict'
import { openFixtureDatabase } from './helpers/database.mjs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture, client } from './helpers/server.mjs'

test('player: concorrência, recusas persistentes, volume e revogação de aparelho', async (t) => {
  const fixture = await startFixture(3189)
  const db = await openFixtureDatabase(fixture.dir)
  t.after(async () => {
    await db.close()
    await fixture.close()
  })
  const host = client(fixture.base),
    guest = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  await guest.request('/api/guest', { name: 'Convidado' })
  const device = (await host.request('/api/device', { label: 'TV' })).data
  const other = (await host.request('/api/device', { label: 'Celular' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  const state = () => db.readState()
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
  const seed = await state()
  Object.assign(seed, { current: first, queue: [second, third, fourth, fifth], paused: false })
  await db.writeState(JSON.stringify(seed))
  const report = (action, queueId, extra = {}, token = device.token) =>
    host.request('/api/player', { action, queueId, ...extra }, 'POST', {
      'x-qroke-device-key': token,
    })
  const skips = await Promise.all(
    [1, 2].map(() => host.request('/api/control', { action: 'skip', queueId: first.queueId })),
  )
  assert.ok(skips.every((r) => r.status === 200))
  assert.equal(skips.filter((r) => r.data.stale).length, 1)
  assert.equal((await state()).current.queueId, second.queueId)
  assert.equal((await report('ended', first.queueId)).data.stale, true)
  await Promise.all([
    report('ended', second.queueId),
    host.request('/api/control', { action: 'skip', queueId: second.queueId }),
  ])
  assert.equal((await state()).current.queueId, third.queueId)
  await report('error', third.queueId, { errorCode: 150 })
  assert.equal((await state()).current.queueId, fourth.queueId)
  assert.equal((await state()).history.at(-1).errorCode, 150)
  await report('error', fourth.queueId, { errorCode: 101 })
  assert.equal((await state()).current.queueId, fourth.queueId)
  assert.equal((await state()).playbackIssue.halted, true)
  assert.equal((await state()).queue.length, 1)
  await report('ended', fourth.queueId)
  assert.equal((await state()).current.queueId, fourth.queueId)
  assert.equal((await host.request('/api/control', { action: 'pause', paused: false })).status, 409)
  assert.equal(await db.blockedCount(), 2)
  assert.equal((await guest.request('/api/queue', { id: third.id, source: 'youtube' })).status, 409)
  await host.request('/api/control', { action: 'retry', queueId: fourth.queueId })
  const retried = (await state()).current.queueId
  assert.notEqual(retried, fourth.queueId)
  assert.equal((await report('error', fourth.queueId, { errorCode: 150 })).data.stale, true)
  await report('error', retried, { errorCode: 5 })
  assert.equal((await state()).current.queueId, retried)
  assert.equal(await db.blockedCount(), 2)
  assert.equal((await guest.request('/api/control', { action: 'volume', volume: 37 })).status, 401)
  assert.equal((await host.request('/api/control', { action: 'volume', volume: 101 })).status, 400)
  await host.request('/api/control', { action: 'volume', volume: 37 })
  await fixture.restart()
  assert.equal((await state()).volume, 37)
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
  const before = await state()
  await host.request('/api/control', { action: 'remove-device', deviceId: device.id })
  assert.equal((await state()).playerId, null)
  assert.equal((await state()).paused, true)
  assert.equal((await state()).current.queueId, before.current.queueId)
  assert.deepEqual((await state()).queue, before.queue)
  assert.equal((await report('ended', retried)).status, 401)
  const barrier = (await state()).playerReadyAt
  await host.request('/api/control', { action: 'assign', deviceId: other.id })
  assert.equal((await state()).playerReadyAt, barrier)
  assert.equal((await report('progress', retried, {}, other.token)).status, 409)
})

test('aparelhos: metadados autenticados, privados e compatíveis com registros antigos', async (t) => {
  const fixture = await startFixture(3182)
  t.after(() => fixture.close())
  const host = client(fixture.base),
    guest = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  const info = {
    kind: 'phone',
    platform: 'Android',
    platformVersion: '16',
    browser: 'Chrome',
    browserVersion: '146.0',
    model: 'SM-S921B',
    appMode: 'browser',
    view: 'player',
  }
  const device = (await guest.request('/api/device', { label: 'Celular da sala', info })).data
  const headers = { 'x-qroke-device-key': device.token }
  assert.equal((await guest.request('/api/devices')).status, 401)
  let data = (await host.request('/api/devices')).data.devices.find((d) => d.id === device.id)
  assert.equal(data.info.model, 'SM-S921B')
  assert.equal(data.info.appVersion, '0.1.0')
  assert.ok(!('token' in data))
  assert.ok(
    !('info' in (await guest.request('/api/state')).data.devices.find((d) => d.id === device.id)),
  )
  assert.equal((await guest.request('/api/device/heartbeat', { info }, 'POST')).status, 401)
  assert.equal(
    (
      await guest.request(
        '/api/device/heartbeat',
        { info: { ...info, model: 'x'.repeat(65) } },
        'POST',
        headers,
      )
    ).status,
    400,
  )
  await host.request('/api/control', {
    action: 'rename-device',
    deviceId: device.id,
    label: 'TV da sala',
  })
  assert.equal(
    (
      await guest.request(
        '/api/device/heartbeat',
        { info: { ...info, view: 'busca', appMode: 'standalone' } },
        'POST',
        headers,
      )
    ).status,
    200,
  )
  assert.equal((await guest.request('/api/device/heartbeat', {}, 'POST', headers)).status, 200)
  await fixture.restart()
  data = (await host.request('/api/devices')).data.devices.find((d) => d.id === device.id)
  assert.equal(data.label, 'TV da sala')
  assert.equal(data.info.view, 'busca')
  assert.equal(data.info.appMode, 'standalone')
  assert.equal(data.info.model, 'SM-S921B')
})
