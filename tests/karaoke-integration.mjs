import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from './helpers/server.mjs'
test('karaokê: cantores, configuração, preparação confirmada e votos negativos', async (t) => {
  const fixture = await startFixture(3186),
    db = new Database(join(fixture.dir, 'party.sqlite'))
  t.after(async () => {
    db.close()
    await fixture.close()
  })
  const a = client(fixture.base),
    b = client(fixture.base),
    c = client(fixture.base),
    host = client(fixture.base)
  const ana = (await a.request('/api/guest', { name: 'Ana' })).data,
    bia = (await b.request('/api/guest', { name: 'Bia' })).data,
    caio = (await c.request('/api/guest', { name: 'Caio' })).data
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  assert.equal(
    (await a.request('/api/control', { action: 'karaoke-settings', seconds: 8, music: true }))
      .status,
    401,
  )
  assert.equal(
    (await host.request('/api/control', { action: 'karaoke-settings', seconds: 31, music: true }))
      .status,
    400,
  )
  const read = () => JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  assert.equal(read().karaokeDelaySeconds, 5)
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 2, music: false })
  const tracks = (await a.request('/api/search?q=Faixa&source=local')).data.tracks
  // Biblioteca não muda metadados confiáveis: não é possível forjar karaoke no corpo.
  await a.request('/api/queue', tracks[0])
  assert.equal(read().queue[0].karaoke, false)
  const s = read()
  s.queue[0].karaoke = true
  s.queue[0].singers = [ana, bia, caio].map(({ id, name }) => ({ id, name }))
  for (const [n, track] of tracks.slice(1, 3).entries())
    s.queue.push({
      ...track,
      queueId: randomUUID(),
      karaoke: false,
      guestId: ana.id,
      guestName: 'Ana',
      origin: 'human',
      enqueuedAt: Date.now() + n + 1,
      round: 0,
      manualOrder: null,
    })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(s))
  const device = (await host.request('/api/device', { label: 'PLAYER' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  const id = read().current.queueId
  assert.equal(read().karaokeStartsAt, null)
  assert.equal(read().karaokeLeadSeconds, 2)
  const report = (action, extra = {}) =>
    host.request('/api/player', { action, queueId: id, ...extra }, 'POST', {
      'x-qroke-device-key': device.token,
    })
  assert.equal((await report('ended')).data.waiting, true)
  assert.equal((await report('ready')).status, 200)
  const starts = read().karaokeStartsAt
  assert.ok(starts > Date.now() + 1000)
  await report('ready')
  assert.equal(read().karaokeStartsAt, starts)
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 10, music: true })
  assert.equal(read().karaokeStartsAt, starts)
  assert.equal(read().karaokeLeadSeconds, 2)
  await a.request('/api/guest/name', { name: 'Ana Maria' })
  assert.equal(read().current.singers[0].name, 'Ana Maria')
  assert.equal((await report('error', { errorCode: 150 })).data.waiting, true)
  assert.equal(read().history.length, 0)
  const first = read().queue[0].queueId
  await Promise.all([
    a.request('/api/queue/' + first + '/vote', { value: -1 }),
    b.request('/api/queue/' + first + '/vote', { value: -1 }),
  ])
  assert.equal(read().queue.at(-1).queueId, first)
  assert.equal(read().queue.at(-1).votes, -2)
  assert.equal((await a.request('/api/session')).data.queueReactions[first], -1)
  await a.request('/api/queue/' + first + '/vote', { value: 0 })
  assert.equal(read().queue.at(-1).votes, -1)
  await fixture.restart()
  assert.equal(read().karaokeDelaySeconds, 10)
  assert.equal((await b.request('/api/session')).data.queueReactions[first], -1)
  await b.request('/api/queue/' + first + '/vote', { value: 0 })
  assert.equal(read().queue[0].queueId, first)
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, starts - Date.now() + 30)))
  assert.equal((await report('ended')).status, 200)
  assert.equal(read().current.queueId, first)
  assert.equal(read().karaokeLeadSeconds, 0)
})

test('karaokê: prioridade publicada, reordenação protegida e sequência após restart', async (t) => {
  const fixture = await startFixture(3186)
  const db = new Database(join(fixture.dir, 'party.sqlite'))
  t.after(async () => {
    db.close()
    await fixture.close()
  })
  const host = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  const device = (await host.request('/api/device', { label: 'Karaokê' })).data
  const read = () => JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  const make = (index, karaoke) => ({
    id: String(index).padStart(11, '0'),
    source: 'youtube',
    title: 'Faixa ' + index,
    artist: 'Teste',
    duration: 30,
    thumbnail: '',
    karaoke,
    queueId: randomUUID(),
    guestId: 'fixture',
    guestName: 'Ana',
    origin: 'human',
    enqueuedAt: index,
    round: 0,
    manualOrder: null,
  })
  const first = make(1, true),
    regular = make(2, false),
    next = make(3, true)
  const state = read()
  Object.assign(state, {
    current: first,
    queue: [regular, next],
    playerId: device.id,
    revision: state.revision + 1,
  })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(state))
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 0, music: false })
  assert.deepEqual(
    (await host.request('/api/state')).data.queue.map((item) => item.id),
    [next.id, regular.id],
  )
  const rejected = await host.request('/api/control', {
    action: 'reorder',
    ids: [regular.queueId, next.queueId],
    revision: read().revision,
  })
  assert.equal(rejected.status, 409)
  assert.match(rejected.data.statusMessage, /Durante o karaok/)
  assert.deepEqual(
    read().queue.map((item) => item.id),
    [next.id, regular.id],
  )
  await fixture.restart()
  assert.deepEqual(
    (await host.request('/api/state')).data.queue.map((item) => item.id),
    [next.id, regular.id],
  )
  await host.request('/api/control', { action: 'skip', queueId: first.queueId })
  assert.equal(read().current.id, next.id)
  await host.request('/api/control', { action: 'skip', queueId: first.queueId })
  assert.equal(read().current.id, next.id)
  await host.request('/api/control', { action: 'skip', queueId: next.queueId })
  assert.equal(read().current.id, regular.id)
  assert.equal(read().queue.length, 0)
})
