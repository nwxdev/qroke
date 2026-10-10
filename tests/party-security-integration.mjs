import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from './helpers/server.mjs'

test(
  'festas isoladas, dono, DJ, revogação, sessão vinculada e códigos de uso único',
  { timeout: 90000 },
  async (t) => {
    const first = await startFixture(3268, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3268',
    })
    const second = await startFixture(3269, {
      NUXT_ACCESS_REQUIRED: 'true',
      NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3268',
      NUXT_MONGODB_DATABASE: first.databaseName,
    })
    t.after(async () => {
      await second.close()
      await first.close()
    })
    const owner = client(first.base),
      another = client(second.base),
      guest = client(second.base),
      stranger = client(first.base)
    const create = async (who, name) => {
      const result = await who.request('/api/parties', {
        name,
        ownerName: name,
        idempotencyKey: randomUUID(),
      })
      assert.equal(result.status, 201, JSON.stringify(result.data))
      return '/api/f/' + result.data.party.id
    }
    const a = await create(owner, 'Ana'),
      b = await create(another, 'Bia')
    const session = await owner.request(a + '/session')
    assert.equal(session.data.role, 'owner')
    assert.equal(session.data.admin, true)
    assert.equal(session.data.guest.name, 'Ana')
    assert.equal((await another.request(a + '/state')).status, 401)
    assert.equal((await owner.request(b + '/state')).status, 401)
    const invite = (await owner.request(a + '/network/invite')).data.url
    const token = new URLSearchParams(new URL(invite).hash.slice(1)).get('convite')
    assert.equal(
      (await guest.request('/api/access', { partyId: a.split('/').at(-1), token })).status,
      200,
    )
    assert.equal((await guest.request(a + '/guest', { name: 'Convidado' })).status, 200)
    const device = (await guest.request(a + '/device', { label: 'Telefone' })).data
    const ownerDevice = (await owner.request(a + '/device', { label: 'Som' })).data
    const outsiderDevice = (await another.request(b + '/device', { label: 'Outra festa' })).data
    assert.equal((await guest.request(a + '/session')).data.role, 'guest')
    assert.equal(
      (await guest.request(a + '/control', { action: 'pause', paused: true })).status,
      403,
    )
    assert.equal((await guest.request(a + '/access', { pin: '123456' })).status, 403)
    assert.equal((await stranger.request(a + '/session')).status, 401)
    assert.equal(
      (await owner.request(a + '/control', { action: 'assign', deviceId: outsiderDevice.id }))
        .status,
      409,
    )
    assert.equal(
      (
        await owner.request(a + '/control', {
          action: 'set-dj',
          deviceId: outsiderDevice.id,
          enabled: true,
        })
      ).status,
      409,
    )
    assert.equal(
      (
        await guest.request(a + '/device/heartbeat', {}, 'POST', {
          'x-qroke-device-key': outsiderDevice.token,
        })
      ).status,
      401,
    )
    assert.equal(
      (
        await owner.request(a + '/control', {
          action: 'set-dj',
          deviceId: device.id,
          enabled: true,
        })
      ).status,
      200,
    )
    assert.equal((await guest.request(a + '/session')).data.role, 'dj')
    assert.equal(
      (await guest.request(a + '/control', { action: 'theme', theme: 'sonic-day' })).status,
      403,
    )
    assert.equal(
      (await owner.request(a + '/control', { action: 'theme', theme: 'sonic-day' })).status,
      200,
    )
    assert.equal((await owner.request(a + '/state')).data.theme, 'sonic-day')
    assert.equal((await another.request(b + '/state')).data.theme, 'classic')
    assert.equal((await guest.request(a + '/party')).data.party.theme, 'sonic-day')
    assert.equal(
      (await owner.request(a + '/control', { action: 'theme', theme: 'invalid' })).status,
      400,
    )
    const tracks = (await owner.request(a + '/search?q=Faixa&source=local')).data.tracks
    await guest.request(a + '/queue', tracks[0])
    const queued = (await owner.request(a + '/state')).data.queue[0].queueId
    assert.equal((await owner.request(a + '/queue/' + queued, {}, 'DELETE')).status, 200)
    await owner.request(a + '/queue', tracks[1])
    const queuedByOwner = (await owner.request(a + '/state')).data.queue[0].queueId
    assert.equal((await guest.request(a + '/queue/' + queuedByOwner, {}, 'DELETE')).status, 200)

    assert.equal(
      (await guest.request(a + '/control', { action: 'volume', volume: 37 })).status,
      200,
    )
    assert.equal(
      (await guest.request(a + '/control', { action: 'pause', paused: true })).status,
      200,
    )
    assert.equal(
      (
        await guest.request(a + '/control', {
          action: 'set-dj',
          deviceId: ownerDevice.id,
          enabled: true,
        })
      ).status,
      403,
    )
    assert.equal((await guest.request(a + '/party/close', {})).status, 403)
    assert.equal((await guest.request(b + '/control', { action: 'volume', volume: 0 })).status, 401)
    assert.notEqual((await another.request(b + '/state')).data.volume, 37)
    const devices = (await owner.request(a + '/devices')).data.devices
    assert.equal(devices.find((d) => d.id === device.id).guestName, 'Convidado')
    assert.equal(devices.find((d) => d.id === device.id).role, 'dj')
    assert.ok(devices.find((d) => d.id === device.id).connectedAt)
    const linkedGuest = client(first.base)
    const link = (await guest.request(a + '/session-link', {})).data.code
    assert.equal(
      (await linkedGuest.request('/api/session-link/accept', { code: link })).status,
      200,
    )
    assert.equal((await linkedGuest.request(a + '/session')).data.role, 'dj')
    assert.equal((await stranger.request('/api/session-link/accept', { code: link })).status, 401)
    assert.equal((await linkedGuest.request(b + '/state')).status, 401)
    const ownerCopy = client(second.base)
    const ownerLink = (await owner.request(a + '/session-link', {})).data.code
    assert.equal(
      (await ownerCopy.request('/api/session-link/accept', { code: ownerLink })).status,
      200,
    )
    assert.equal((await ownerCopy.request(a + '/session')).data.role, 'owner')
    assert.equal((await ownerCopy.request(b + '/state')).status, 401)
    assert.equal(
      (
        await owner.request(a + '/control', {
          action: 'set-dj',
          deviceId: device.id,
          enabled: false,
        })
      ).status,
      200,
    )
    assert.equal((await guest.request(a + '/control', { action: 'volume', volume: 0 })).status, 403)
    assert.equal(
      (await linkedGuest.request(a + '/control', { action: 'volume', volume: 0 })).status,
      403,
    )
    const links = await Promise.all([
      ownerCopy.request(a + '/session-link', {}),
      ownerCopy.request(a + '/session-link', {}),
    ])
    const raceCode = links[0].data.code
    const race = await Promise.all([
      stranger.request('/api/session-link/accept', { code: raceCode }),
      client(first.base).request('/api/session-link/accept', { code: raceCode }),
    ])
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 401])
    assert.equal((await owner.request(a + '/invite', {})).status, 200)
    assert.equal((await guest.request(a + '/state')).status, 401)
    assert.equal((await linkedGuest.request(a + '/state')).status, 401)
    assert.equal((await ownerCopy.request(a + '/party/close', {})).status, 200)
    assert.equal((await owner.request(a + '/state')).status, 410)
    assert.equal((await another.request(b + '/state')).status, 200)
    assert.equal(
      (await stranger.request('/api/session-link/accept', { code: links[1].data.code })).status,
      410,
    )
  },
)
