import { cleanupParties } from '../server/core/party-cleanup'
import { BrowserSessions } from '../server/core/browser-sessions'
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

describe('Ciclo de vida das festas', () => {
  async function modern(id: string, milliseconds = 86400000) {
    const database = new MongoPartyDatabase(client, db, 'nwx', id)
    const now = Date.now()
    await database.create({
      name: id,
      pinHash: 'fixture-hash',
      createdAt: new Date(now),
      expiresAt: new Date(now + milliseconds),
      purgeAt: new Date(now + milliseconds + 86400000),
      createdBy: 'test',
      creationKey: randomUUID(),
    })
    return database
  }
  it('aborta transação que começou ativa e terminou depois do prazo', async () => {
    const party = await modern('deadline', 300)
    await expect(
      party.mutate(async (state) => {
        state.position = 999
        await new Promise((resolve) => setTimeout(resolve, 350))
      }),
    ).rejects.toMatchObject({ statusCode: 410 })
    const raw = await db.collection('parties').findOne({ _id: party.scope })
    expect(raw?.state.position).toBe(0)
    await expect(party.createGuest('Tarde')).rejects.toMatchObject({ statusCode: 410 })
  })
  it('serializa encerramento com alterações e bloqueia novas escritas', async () => {
    const party = await modern('closing')
    let release!: () => void, entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const changing = party.mutate(async (state) => {
      entered()
      await gate
      state.position++
    })
    await started
    const closing = party.close()
    release()
    await changing
    await closing
    await expect(
      party.mutate((state) => {
        state.position++
      }),
    ).rejects.toMatchObject({ statusCode: 410 })
    await expect(party.state()).rejects.toMatchObject({ statusCode: 410 })
  })
  it('gera um único convite consistente com criação concorrente', async () => {
    const party = await modern('inviting')
    const store = new EncryptedStore<{ token: string; expires: number }>(
      db,
      party.scope,
      'invite',
      'ab'.repeat(32),
    )
    const values = await Promise.all(Array.from({ length: 12 }, () => party.currentInvite(store)))
    expect(new Set(values.map((value) => value.token)).size).toBe(1)
    expect(await party.acceptInvite((await store.get('current'))!.token)).toBeTruthy()
    expect(values[0]!.expires).toBe((await party.info()).expiresAt)
    await Promise.all(Array.from({ length: 5 }, () => party.currentInvite(store, true)))
    expect(await party.acceptInvite((await store.get('current'))!.token)).toBeTruthy()
    expect(await party.acceptInvite(values[0]!.token)).toBeUndefined()
  })
  it('não rebaixa o dono quando convite e PIN chegam ao mesmo tempo', async () => {
    const sessions = new BrowserSessions(db, 'ab'.repeat(32)),
      party = await modern('membership')
    const input = {
      organizationId: 'nwx',
      partyId: party.partyId,
      scope: party.scope,
      expiresAt: new Date(Date.now() + 60000),
    }
    await Promise.all([
      sessions.grant('browser', { ...input, role: 'owner', version: 0 }),
      sessions.grant('browser', { ...input, role: 'guest', version: 1 }),
    ])
    await sessions.grant('browser', { ...input, role: 'guest', version: 1 })
    expect((await sessions.get('browser', party.scope))?.role).toBe('owner')
  })
  it('remove somente festas vencidas após a retenção e preserva o legado', async () => {
    const ended = await modern('purge'),
      active = await modern('keep'),
      recent = await modern('recent')
    await ended.close()
    await recent.close()
    await db
      .collection('parties')
      .updateOne({ _id: ended.scope }, { $set: { purgeAt: new Date(Date.now() - 1000) } })
    await db.collection('parties').updateOne({ _id: a.scope }, { $set: { purgeAt: new Date(0) } })
    for (const name of ['oauth', 'memberships']) {
      await db.collection(name).insertOne({
        scope: ended.scope,
        kind: 'cleanup-fixture',
        expiresAt: new Date(Date.now() + 60000),
      })
      await db.collection(name).insertOne({
        scope: active.scope,
        kind: 'cleanup-fixture',
        expiresAt: new Date(Date.now() + 60000),
      })
    }
    expect(await cleanupParties(db)).toBe(1)
    expect(await cleanupParties(db)).toBe(0)
    expect(await db.collection('parties').findOne({ _id: ended.scope })).toBeNull()
    expect(await db.collection('parties').findOne({ _id: recent.scope })).toBeTruthy()
    expect(await a.state()).toBeTruthy()
    expect(await active.state()).toBeTruthy()
    expect(await db.collection('oauth').countDocuments({ scope: ended.scope })).toBe(0)
    expect(await db.collection('memberships').countDocuments({ scope: ended.scope })).toBe(0)
    expect(await db.collection('oauth').countDocuments({ scope: active.scope })).toBe(1)
  })
})
