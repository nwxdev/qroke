import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { startFixture, client } from './helpers/server.mjs'
test('Nitro real: convidados, fila, PLAYER, permissões e persistência', async (t) => {
  const server = await startFixture()
  t.after(() => server.close())
  const ana = client(server.base),
    bruno = client(server.base),
    host = client(server.base),
    attacker = client(server.base)
  let tracks, anaGuest, brunoGuest, device
  await t.test('renderiza as quatro rotas e recusa mutações externas', async () => {
    for (const path of ['/', '/host', '/tv', '/qr'])
      assert.equal((await fetch(server.base + path)).status, 200, path)
    assert.equal((await ana.request('/api/control', { action: 'skip' })).status, 401)
    assert.equal(
      (
        await ana.request('/api/guest', { name: 'Ana' }, 'POST', {
          origin: 'https://external.invalid',
        })
      ).status,
      403,
    )
    assert.equal(
      (await fetch(server.base + '/api/guest', { method: 'POST', body: 'name=Ana' })).status,
      415,
    )
  })
  await t.test(
    'valida nome e entrega identidade por cookie, sem aceitar guestId forjado',
    async () => {
      for (const name of ['', ' ', 'A', 'A'.repeat(21)])
        assert.equal((await ana.request('/api/guest', { name })).status, 400)
      anaGuest = (await ana.request('/api/guest', { name: 'Ana' })).data
      brunoGuest = (await bruno.request('/api/guest', { name: 'Ana', guestId: anaGuest.id })).data
      assert.equal(brunoGuest.name, 'Ana (2)')
      assert.notEqual(brunoGuest.id, anaGuest.id)
    },
  )
  await t.test('indexa biblioteca, serve bytes e recusa arquivos arbitrários', async () => {
    tracks = (await ana.request('/api/search?q=Faixa&source=local')).data.tracks
    assert.equal(tracks.length, 7)
    const response = await fetch(server.base + '/api/library/' + tracks[0].id, {
      headers: { range: 'bytes=0-9' },
    })
    assert.equal(response.status, 206)
    assert.equal((await response.arrayBuffer()).byteLength, 10)
    assert.equal(
      (
        await fetch(server.base + '/api/library/' + tracks[0].id, {
          headers: { range: 'bytes=99999999-' },
        })
      ).status,
      416,
    )
    assert.equal((await fetch(server.base + '/api/library/unknown')).status, 404)
    assert.equal(
      (await ana.request('/api/queue', { id: 'forged-id', source: 'youtube', karaoke: false }))
        .status,
      400,
    )
  })
  await t.test('notifica por WS, deduplica toques e intercala dois convidados', async () => {
    const ws = new WebSocket(server.base.replace('http', 'ws') + '/ws')
    await once(ws, 'open')
    await ana.request('/api/queue', tracks[0])
    await ana.request('/api/queue', tracks[1])
    await ana.request('/api/queue', tracks[1])
    const update = once(ws, 'message')
    await bruno.request('/api/queue', tracks[2])
    await update
    const s = (await ana.request('/api/state')).data
    assert.deepEqual(
      s.queue.map((t) => t.id),
      [tracks[0].id, tracks[2].id, tracks[1].id],
    )
    ws.close()
  })
  await t.test('somente dono e admin removem e só admin reordena', async () => {
    let s = (await ana.request('/api/state')).data
    assert.equal(
      (await bruno.request('/api/queue/' + s.queue[0].queueId, {}, 'DELETE')).status,
      403,
    )
    assert.equal((await host.request('/api/auth', { action: 'login', pin: '4321' })).status, 200)
    const ids = [...s.queue].reverse().map((t) => t.queueId)
    assert.equal(
      (await host.request('/api/control', { action: 'reorder', ids, revision: s.revision - 1 }))
        .status,
      409,
    )
    assert.equal(
      (await host.request('/api/control', { action: 'reorder', ids, revision: s.revision })).status,
      200,
    )
    s = (await ana.request('/api/state')).data
    assert.deepEqual(
      s.queue.map((t) => t.queueId),
      ids,
    )
    assert.equal((await host.request('/api/control', { action: 'reset-order' })).status, 200)
  })
  await t.test('PLAYER exige credencial privada, ignora evento atrasado e avança', async () => {
    device = (await host.request('/api/device', { label: 'PLAYER teste' })).data
    assert.equal(
      (await host.request('/api/control', { action: 'assign', deviceId: device.id })).status,
      200,
    )
    let s = (await ana.request('/api/state')).data
    assert.equal(s.current.id, tracks[0].id)
    const headers = { 'x-qroke-device-key': device.token }
    assert.equal(
      (await attacker.request('/api/player', { action: 'ended', queueId: s.current.queueId }))
        .status,
      401,
    )
    assert.equal(
      (
        await attacker.request(
          '/api/player',
          { action: 'ended', queueId: s.current.queueId },
          'POST',
          { 'x-qroke-device-key': device.id },
        )
      ).status,
      401,
    )
    const old = s.current.queueId
    assert.equal(
      (await host.request('/api/player', { action: 'ended', queueId: old }, 'POST', headers))
        .status,
      200,
    )
    s = (await ana.request('/api/state')).data
    assert.equal(s.current.id, tracks[2].id)
    assert.equal(
      (await host.request('/api/player', { action: 'ended', queueId: old }, 'POST', headers)).data
        .stale,
      true,
    )
    assert.equal((await ana.request('/api/state')).data.current.id, tracks[2].id)
  })
  await t.test('persiste fila, sessão e posição após reiniciar o processo', async () => {
    const before = (await host.request('/api/state')).data
    await host.request(
      '/api/player',
      { action: 'progress', queueId: before.current.queueId, position: 3, duration: 8 },
      'POST',
      { 'x-qroke-device-key': device.token },
    )
    await server.restart()
    const after = (await host.request('/api/state')).data
    assert.equal(after.current.queueId, before.current.queueId)
    assert.equal(after.position, 3)
    assert.deepEqual(after.queue, before.queue)
    assert.equal((await ana.request('/api/session')).data.guest.id, anaGuest.id)
  })
  await t.test(
    'continuação local respeita dedupe e escolha humana passa à frente das pendentes',
    async () => {
      await host.request('/api/control', { action: 'auto', enabled: true })
      const headers = { 'x-qroke-device-key': device.token }
      for (let i = 0; i < 2; i++) {
        const s = (await host.request('/api/state')).data
        const ended = await host.request(
          '/api/player',
          { action: 'ended', queueId: s.current.queueId },
          'POST',
          headers,
        )
        assert.equal(ended.status, 200, JSON.stringify(ended.data))
      }
      for (let i = 0; i < 30; i++) {
        const s = (await host.request('/api/state')).data
        if (s.current?.origin === 'auto') break
        await new Promise((r) => setTimeout(r, 50))
      }
      const s = (await host.request('/api/state')).data
      assert.equal(s.current.origin, 'auto')
      assert(!tracks.slice(0, 3).some((t) => t.id === s.current.id))
      await ana.request('/api/queue', tracks[6])
      assert.equal((await host.request('/api/state')).data.queue[0].origin, 'human')
      await host.request('/api/control', { action: 'auto', enabled: false })
    },
  )
  await t.test(
    'transferência revoga o aparelho anterior e impõe a janela de silêncio',
    async () => {
      const next = (await host.request('/api/device', { label: 'Segundo PLAYER' })).data
      const before = (await host.request('/api/state')).data
      await host.request('/api/control', { action: 'assign', deviceId: next.id })
      const after = (await host.request('/api/state')).data
      assert.equal(after.playerId, next.id)
      assert(after.playerReadyAt > Date.now())
      const event = { action: 'ended', queueId: before.current.queueId }
      assert.equal(
        (await host.request('/api/player', event, 'POST', { 'x-qroke-device-key': device.token }))
          .status,
        403,
      )
      assert.equal(
        (await host.request('/api/player', event, 'POST', { 'x-qroke-device-key': next.token }))
          .status,
        409,
      )
      assert.equal((await host.request('/api/state')).data.current.queueId, before.current.queueId)
    },
  )
  await t.test('limita PIN por IP e logout revoga controles', async () => {
    for (let i = 0; i < 4; i++)
      assert.equal(
        (await attacker.request('/api/auth', { action: 'login', pin: '0000' })).status,
        401,
      )
    assert.equal(
      (await attacker.request('/api/auth', { action: 'login', pin: '0000' })).status,
      429,
    )
    await host.request('/api/auth', { action: 'logout' })
    assert.equal((await host.request('/api/control', { action: 'skip' })).status, 401)
  })
})

test('dois logins simultâneos não dividem o controle e logout libera o próximo', async (t) => {
  const server = await startFixture(3193)
  t.after(() => server.close())
  const clients = [client(server.base), client(server.base)]
  const results = await Promise.all(
    clients.map((c) => c.request('/api/auth', { action: 'login', pin: '4321' })),
  )
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  const owner = clients[results.findIndex((r) => r.status === 200)]
  const waiting = clients[results.findIndex((r) => r.status === 409)]
  const before = (await owner.request('/api/session')).data
  assert.equal(before.admin, true)
  assert.equal(before.adminLeaseSeconds, 120)
  assert.equal((await waiting.request('/api/session')).data.admin, false)
  assert.equal(
    (await waiting.request('/api/control', { action: 'mode', mode: 'music' })).status,
    401,
  )
  await owner.request('/api/auth', { action: 'touch' })
  assert.equal((await owner.request('/api/session')).data.adminExpiresAt, before.adminExpiresAt)
  await server.restart()
  assert.equal((await owner.request('/api/session')).data.adminExpiresAt, before.adminExpiresAt)
  await owner.request('/api/auth', { action: 'logout' })
  assert.equal((await waiting.request('/api/auth', { action: 'login', pin: '4321' })).status, 200)
  assert.equal((await owner.request('/api/control', { action: 'skip' })).status, 401)
})
