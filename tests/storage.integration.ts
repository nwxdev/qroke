import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'node:crypto'
import { MongoPartyDatabase, initializeDatabase } from '../server/core/mongo-database'
import { EncryptedStore } from '../server/core/shared-store'
import { skipTrack } from '../server/core/playback'
const client = new MongoClient(
  process.env.QROKE_MONGODB_URI ||
    'mongodb://127.0.0.1:37017/?replicaSet=rs0&directConnection=true',
)
const db = client.db('qroke_test_storage_' + randomUUID().replaceAll('-', ''))
const a = new MongoPartyDatabase(client, db, 'nwx', 'one')
const b = new MongoPartyDatabase(client, db, 'nwx', 'one')
const other = new MongoPartyDatabase(client, db, 'nwx', 'two')
beforeAll(async () => {
  await client.connect()
  await initializeDatabase(db)
  await a.ensure()
  await other.ensure()
})
afterAll(async () => {
  await db.dropDatabase()
  await client.close()
})
describe('MongoDB real: isolamento e concorrência', () => {
  it('preserva todas as atualizações concorrentes entre instâncias', async () => {
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        (i % 2 ? a : b).mutate((s) => {
          s.position++
        }),
      ),
    )
    expect((await a.state()).position).toBe(30)
    expect((await other.state()).position).toBe(0)
  })
  it('concede apenas uma reserva de anfitrião', async () => {
    const leases = await Promise.all([a.claimAdmin(undefined, 120), b.claimAdmin(undefined, 120)])
    expect(leases.filter((l) => l.granted)).toHaveLength(1)
    expect(await other.admin(leases.find((l) => l.granted)!.token)).toBe(false)
    await a.logout(leases.find((l) => l.granted)!.token)
  })
  it('isola convidados e rejeita votos de outra festa', async () => {
    const guest = await a.createGuest('Ana')
    expect(await b.guest(guest.token)).toEqual({ id: guest.id, name: 'Ana' })
    expect(await other.guest(guest.token)).toBeUndefined()
    await expect(other.vote(randomUUID(), guest.id, 1)).rejects.toThrow('Entre na festa')
  })
  it('avança uma música uma única vez diante de comandos repetidos', async () => {
    const track = (n: number) => ({
      id: String(n).padStart(11, '0'),
      queueId: randomUUID(),
      source: 'youtube' as const,
      title: 'Faixa ' + n,
      artist: 'Teste',
      duration: 120,
      thumbnail: '',
      karaoke: false,
      guestId: 'one',
      guestName: 'Ana',
      origin: 'human' as const,
      enqueuedAt: n,
      round: 0,
      manualOrder: null,
    })
    const first = track(1),
      second = track(2),
      third = track(3)
    await a.mutate((s) => {
      s.current = first
      s.queue = [second, third]
      s.playerId = randomUUID()
    })
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        (i % 2 ? a : b).mutate((s) => {
          skipTrack(s, first.queueId)
        }),
      ),
    )
    expect((await a.state()).current?.queueId).toBe(second.queueId)
    expect((await a.state()).history.filter((t) => t.queueId === first.queueId)).toHaveLength(1)
  })
  it('revoga convites entre instâncias e mantém o segredo cifrado', async () => {
    const token = await a.rotateInvite()
    expect(await b.acceptInvite(token)).toBeTruthy()
    await b.rotateInvite()
    expect(await a.acceptInvite(token)).toBeUndefined()
    const store = new EncryptedStore<{ expires: number; access: string }>(
      db,
      a.scope,
      'test',
      'ab'.repeat(32),
    )
    await store.set('account', { access: 'secret-access-token', expires: Date.now() + 60000 })
    const raw = await db.collection('oauth').findOne({ scope: a.scope, kind: 'test' })
    expect(JSON.stringify(raw)).not.toContain('secret-access-token')
    const second = new EncryptedStore<{ expires: number; access: string }>(
      db,
      a.scope,
      'test',
      'ab'.repeat(32),
    )
    expect((await second.get('account'))?.access).toBe('secret-access-token')
    const consumed = await Promise.all([store.take('account'), second.take('account')])
    expect(consumed.filter(Boolean)).toHaveLength(1)
    expect(
      await store.replaceIfPresent('account', { access: 'new', expires: Date.now() + 60000 }),
    ).toBe(false)
  })
})
