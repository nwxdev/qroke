import test from 'node:test'
import assert from 'node:assert/strict'
import { openFixtureDatabase } from './helpers/database.mjs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from './helpers/server.mjs'
test('karaokê: cantores, configuração, preparação confirmada e votos negativos', async (t) => {
  const fixture = await startFixture(3186),
    db = await openFixtureDatabase(fixture.dir)
  t.after(async () => {
    await db.close()
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
  const read = () => db.readState()
  assert.equal((await read()).karaokeDelaySeconds, 10)
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 2, music: false })
  const tracks = (await a.request('/api/search?q=Faixa&source=local')).data.tracks
  // Biblioteca não muda metadados confiáveis: não é possível forjar karaoke no corpo.
  await a.request('/api/queue', tracks[0])
  assert.equal((await read()).queue[0].karaoke, false)
  const s = await read()
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
  await db.writeState(JSON.stringify(s))
  const device = (await host.request('/api/device', { label: 'PLAYER' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  const id = (await read()).current.queueId
  assert.equal((await read()).karaokeStartsAt, null)
  assert.equal((await read()).karaokeLeadSeconds, 2)
  const report = (action, extra = {}) =>
    host.request('/api/player', { action, queueId: id, ...extra }, 'POST', {
      'x-qroke-device-key': device.token,
    })
  assert.equal((await report('ended')).data.waiting, true)
  assert.equal((await report('ready')).status, 200)
  const starts = (await read()).karaokeStartsAt
  assert.ok(starts > Date.now() + 1000)
  await report('ready')
  assert.equal((await read()).karaokeStartsAt, starts)
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 10, music: true })
  assert.equal((await read()).karaokeStartsAt, starts)
  assert.equal((await read()).karaokeLeadSeconds, 2)
  await a.request('/api/guest/name', { name: 'Ana Maria' })
  assert.equal((await read()).current.singers[0].name, 'Ana Maria')
  assert.equal((await report('error', { errorCode: 150 })).data.waiting, true)
  assert.equal((await read()).history.length, 0)
  const first = (await read()).queue[0].queueId
  await Promise.all([
    a.request('/api/queue/' + first + '/vote', { value: -1 }),
    b.request('/api/queue/' + first + '/vote', { value: -1 }),
  ])
  assert.equal((await read()).queue.at(-1).queueId, first)
  assert.equal((await read()).queue.at(-1).votes, -2)
  assert.equal((await a.request('/api/session')).data.queueReactions[first], -1)
  await a.request('/api/queue/' + first + '/vote', { value: 0 })
  assert.equal((await read()).queue.at(-1).votes, -1)
  await fixture.restart()
  assert.equal((await read()).karaokeDelaySeconds, 10)
  assert.equal((await b.request('/api/session')).data.queueReactions[first], -1)
  await b.request('/api/queue/' + first + '/vote', { value: 0 })
  assert.equal((await read()).queue[0].queueId, first)
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, starts - Date.now() + 30)))
  assert.equal((await report('ended')).status, 200)
  assert.equal((await read()).current.queueId, first)
  assert.equal((await read()).karaokeLeadSeconds, 0)
})

test('karaokê: prioridade publicada, reordenação protegida e sequência após restart', async (t) => {
  const fixture = await startFixture(3186)
  const db = await openFixtureDatabase(fixture.dir)
  t.after(async () => {
    await db.close()
    await fixture.close()
  })
  const host = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  const device = (await host.request('/api/device', { label: 'Karaokê' })).data
  const read = () => db.readState()
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
  const state = await read()
  Object.assign(state, {
    current: first,
    queue: [regular, next],
    playerId: device.id,
    revision: state.revision + 1,
  })
  await db.writeState(JSON.stringify(state))
  await host.request('/api/control', { action: 'karaoke-settings', seconds: 0, music: false })
  assert.deepEqual(
    (await host.request('/api/state')).data.queue.map((item) => item.id),
    [next.id, regular.id],
  )
  const rejected = await host.request('/api/control', {
    action: 'reorder',
    ids: [regular.queueId, next.queueId],
    revision: (await read()).revision,
  })
  assert.equal(rejected.status, 409)
  assert.match(rejected.data.statusMessage, /Os pedidos de karaok/)
  assert.deepEqual(
    (await read()).queue.map((item) => item.id),
    [next.id, regular.id],
  )
  await fixture.restart()
  assert.deepEqual(
    (await host.request('/api/state')).data.queue.map((item) => item.id),
    [next.id, regular.id],
  )
  await host.request('/api/control', { action: 'skip', queueId: first.queueId })
  assert.equal((await read()).current.id, next.id)
  await host.request('/api/control', { action: 'skip', queueId: first.queueId })
  assert.equal((await read()).current.id, next.id)
  await host.request('/api/control', { action: 'skip', queueId: next.queueId })
  assert.equal((await read()).current.id, regular.id)
  assert.equal((await read()).queue.length, 0)
})

for (const wholePlaylist of [false, true])
  test(
    'karaokê adicionado como ' +
      (wholePlaylist ? 'playlist' : 'faixa avulsa') +
      ' é próximo durante playlist comum',
    async (t) => {
      const fixture = await startFixture(3186, {
        NODE_OPTIONS:
          '--import=' + new URL('./helpers/youtube-fetch.mjs', import.meta.url).pathname,
        NUXT_YOUTUBE_API_KEY: 'fixture-key',
      })
      const db = await openFixtureDatabase(fixture.dir)
      t.after(async () => {
        await db.close()
        await fixture.close()
      })
      const host = client(fixture.base),
        guest = client(fixture.base)
      const person = (await guest.request('/api/guest', { name: 'Ana' })).data
      await host.request('/api/auth', { action: 'login', pin: '4321' })
      const device = (await host.request('/api/device', { label: 'PLAYER' })).data
      const read = () => db.readState()
      const regular = (n) => ({
        id: String(n).padStart(11, '0'),
        source: 'youtube',
        title: 'Playlist comum ' + n,
        artist: 'Teste',
        duration: 180,
        thumbnail: '',
        karaoke: false,
        queueId: randomUUID(),
        guestId: person.id,
        guestName: person.name,
        origin: 'human',
        enqueuedAt: n,
        round: 0,
        manualOrder: n,
        playlist: { id: 'PLbackground', title: 'Playlist de fundo' },
      })
      const current = regular(1),
        next = regular(2),
        last = regular(3)
      const state = await read()
      Object.assign(state, {
        current,
        queue: [next, last],
        playerId: device.id,
        position: 42,
        duration: 180,
        mode: 'music',
        karaokeDelaySeconds: 0,
        revision: state.revision + 1,
      })
      await db.writeState(JSON.stringify(state))
      const preview = (
        await guest.request('/api/youtube/preview', {
          input: 'PLabcdefghijk',
          karaoke: true,
        })
      ).data
      const imported = await guest.request('/api/youtube/import', {
        ticket: preview.ticket,
        ...(wholePlaylist ? {} : { videoId: preview.tracks[0].id }),
      })
      assert.equal(imported.status, 200)
      assert.equal(imported.data.added, wholePlaylist ? 2 : 1)
      const published = (await guest.request('/api/state')).data
      assert.equal(published.current.queueId, current.queueId)
      assert.equal(published.position, 42)
      assert.equal((await read()).history.length, 0)
      assert.equal(
        published.queue[0].karaoke,
        true,
        'karaokê precisa ser o próximo antes da playlist comum',
      )
      const requests = published.queue.filter((track) => track.karaoke)
      assert.equal(requests.length, wholePlaylist ? 2 : 1)
      assert.equal(!!requests[0].playlist, wholePlaylist)
      assert.deepEqual(
        published.queue.map((track) => track.queueId),
        [...requests.map((track) => track.queueId), next.queueId, last.queueId],
      )
      await fixture.restart()
      assert.deepEqual((await guest.request('/api/state')).data.queue, published.queue)
      const reportEnd = (queueId) =>
        host.request('/api/player', { action: 'ended', queueId }, 'POST', {
          'x-qroke-device-key': device.token,
        })
      assert.equal((await reportEnd(current.queueId)).status, 200)
      assert.equal((await read()).current.queueId, requests[0].queueId)
      await reportEnd(current.queueId)
      assert.equal((await read()).current.queueId, requests[0].queueId)
      for (const request of requests) {
        assert.equal((await read()).current.queueId, request.queueId)
        await reportEnd(request.queueId)
      }
      assert.equal((await read()).current.queueId, next.queueId)
      assert.equal((await read()).current.playlist.title, 'Playlist de fundo')
      assert.deepEqual(
        (await read()).queue.map((track) => track.queueId),
        [last.queueId],
      )
    },
  )
