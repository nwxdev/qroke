import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { ClientSession, Db, MongoClient } from 'mongodb'
import { normalizeName, uniqueName, orderQueue } from './rules'
import type { EncryptedStore } from './shared-store'
import { normalizePartyMedia } from '../../shared/media'
import { initialState } from './initial-state'
import { assertPartyActive, partyInfo, type PartyDetails } from './party-lifecycle'
import type { PartyState, Guest, Device, PublicState } from '../../shared/types'

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex')
export type PartyRow = PartyDetails & {
  _id: string
  organizationId: string
  partyId: string
  version: number
  state: PartyState
  admin?: { tokenHash: string; expiresAt: number }
  invite?: { tokenHash: string; version: number; expiresAt: number }
}
type GuestRow = {
  _id: string
  scope: string
  tokenHash: string
  name: string
  lastSeen: number
  expiresAt: Date
}
type DeviceRow = {
  _id: string
  scope: string
  tokenHash: string
  label: string
  lastSeen: number
  info: Device['info']
}
type VoteRow = { scope: string; queueId: string; guestId: string; value: 1 | -1 }
const contexts = new AsyncLocalStorage<{ scope: string; session: ClientSession; row: PartyRow }>()

export async function initializeDatabase(db: Db) {
  await Promise.all([
    db.collection('parties').createIndex({ creationKey: 1 }, { unique: true, sparse: true }),
    db.collection('parties').createIndex({ purgeAt: 1 }),
    db.collection('memberships').createIndex({ browserHash: 1, expiresAt: 1 }),
    db.collection('memberships').createIndex({ scope: 1 }),
    db.collection('memberships').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    db.collection('guests').createIndex({ scope: 1, tokenHash: 1 }, { unique: true }),
    db.collection('guests').createIndex({ scope: 1, name: 1 }, { unique: true }),
    db.collection('guests').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('devices').createIndex({ scope: 1, tokenHash: 1 }, { unique: true }),
    db.collection('votes').createIndex({ scope: 1, queueId: 1, guestId: 1 }, { unique: true }),
    db.collection('youtube_blocks').createIndex({ scope: 1, id: 1 }, { unique: true }),
    db.collection('youtube_blocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('oauth').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
}
export class MongoPartyDatabase {
  readonly scope: string
  constructor(
    public client: MongoClient,
    public db: Db,
    public organizationId: string,
    public partyId: string,
    private notify: (scope: string) => Promise<unknown> = async () => {},
  ) {
    this.scope = organizationId + ':' + partyId
  }
  private get context() {
    const value = contexts.getStore()
    return value?.scope === this.scope ? value : undefined
  }
  private get options() {
    return this.context ? { session: this.context.session } : {}
  }
  async ensure() {
    await this.db.collection<PartyRow>('parties').updateOne(
      { _id: this.scope },
      {
        $setOnInsert: {
          organizationId: this.organizationId,
          partyId: this.partyId,
          state: initialState(),
          version: 0,
        },
      },
      { upsert: true },
    )
    return this
  }
  async details() {
    const row = await this.db.collection<PartyRow>('parties').findOne({ _id: this.scope })
    if (!row)
      throw Object.assign(new Error('Festa não encontrada.'), {
        statusCode: 404,
        statusMessage: 'Festa não encontrada.',
      })
    return row
  }
  async info() {
    return partyInfo(await this.details())
  }
  async assertActive() {
    assertPartyActive(await this.details())
  }
  async create(
    details: Required<
      Pick<
        PartyDetails,
        'name' | 'pinHash' | 'createdAt' | 'expiresAt' | 'purgeAt' | 'creationKey' | 'createdBy'
      >
    >,
  ) {
    await this.db.collection<PartyRow>('parties').insertOne({
      _id: this.scope,
      organizationId: this.organizationId,
      partyId: this.partyId,
      version: 0,
      state: initialState(),
      ...details,
    })
  }
  async close() {
    return this.write(async (row) => {
      if (!row.closedAt) row.closedAt = new Date()
      row.purgeAt = new Date(row.closedAt.getTime() + 86400000)
      row.state.paused = true
      row.state.current = null
      row.state.playerId = null
      row.state.revision++
      delete row.admin
      delete row.invite
      return partyInfo(row)
    }, true)
  }
  private async write<T>(change: (row: PartyRow) => Promise<T>, allowEnded = false): Promise<T> {
    if (this.context) return change(this.context.row)
    const session = this.client.startSession()
    try {
      const result = await session.withTransaction(
        async () => {
          const row = await this.db
            .collection<PartyRow>('parties')
            .findOneAndUpdate(
              { _id: this.scope },
              { $inc: { version: 1 } },
              { session, returnDocument: 'after' },
            )
          if (!row) throw new Error('Festa não encontrada.')
          if (!allowEnded) assertPartyActive(row)
          if ((row.state.schemaVersion || 1) < 2) normalizePartyMedia(row.state)
          return contexts.run({ scope: this.scope, session, row }, async () => {
            const value = await change(row)
            if (!allowEnded) assertPartyActive(row)
            await this.db
              .collection<PartyRow>('parties')
              .replaceOne({ _id: this.scope }, row, { session })
            return value
          })
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxCommitTimeMS: 5000,
        },
      )
      await this.notify(this.scope).catch(() => {})
      return result as T
    } finally {
      await session.endSession()
    }
  }
  async state(): Promise<PartyState> {
    if (this.context) return this.context.row.state
    const row = await this.db
      .collection<PartyRow>('parties')
      .findOne(
        { _id: this.scope },
        { projection: { state: 1, partyId: 1, expiresAt: 1, closedAt: 1 } },
      )
    if (!row) throw new Error('Festa não encontrada.')
    assertPartyActive(row)
    return normalizePartyMedia(row.state)
  }
  async mutate(change: (state: PartyState) => void | Promise<void>) {
    return this.write(async (row) => {
      await change(row.state)
      normalizePartyMedia(row.state)
      if (row.state.queue.length > 2000) throw new Error('A fila está cheia.')
      row.state.history = row.state.history.slice(-100)
      await this.db
        .collection<VoteRow>('votes')
        .deleteMany(
          { scope: this.scope, queueId: { $nin: row.state.queue.map((item) => item.queueId) } },
          this.options,
        )
      row.state.queue = orderQueue(row.state.queue, [
        ...row.state.history,
        ...(row.state.current ? [row.state.current] : []),
      ])
      row.state.revision++
      return row.state
    })
  }
  private async syncVotes(state: PartyState) {
    const rows = await this.db
      .collection<VoteRow>('votes')
      .find({ scope: this.scope }, this.options)
      .toArray()
    const totals = new Map<string, { votes: number; likes: number; dislikes: number }>()
    for (const vote of rows) {
      const total = totals.get(vote.queueId) || { votes: 0, likes: 0, dislikes: 0 }
      total.votes += vote.value
      if (vote.value === 1) total.likes++
      else total.dislikes++
      totals.set(vote.queueId, total)
    }
    state.queue = state.queue.map((item) => ({
      ...item,
      ...(totals.get(item.queueId) || { votes: 0, likes: 0, dislikes: 0 }),
    }))
  }
  async publicState(): Promise<PublicState> {
    const { history, ...state } = await this.state()
    const [guests, devices] = await Promise.all([
      this.db
        .collection<GuestRow>('guests')
        .find({
          scope: this.scope,
          lastSeen: { $gt: Date.now() - 90000 },
          expiresAt: { $gt: new Date() },
        })
        .sort({ name: 1 })
        .toArray(),
      this.db
        .collection<DeviceRow>('devices')
        .find({ scope: this.scope, lastSeen: { $gt: Date.now() - 20000 } })
        .sort({ label: 1 })
        .toArray(),
    ])
    return {
      ...state,
      party: await this.info(),
      serverTime: Date.now(),
      canGoBack: history.some((item) => item.outcome !== 'error'),
      guests: guests.map((g) => ({ id: g._id, name: g.name })),
      devices: devices.map((d) => ({ id: d._id, label: d.label, lastSeen: d.lastSeen })),
    }
  }
  async guest(token?: string): Promise<Guest | undefined> {
    if (!token) return undefined
    const row = await this.db
      .collection<GuestRow>('guests')
      .findOne(
        { scope: this.scope, tokenHash: hashToken(token), expiresAt: { $gt: new Date() } },
        this.options,
      )
    return row ? { id: row._id, name: row.name } : undefined
  }
  async createGuest(value: string) {
    return this.write(async () => {
      const guests = this.db.collection<GuestRow>('guests')
      const names = await guests
        .find({ scope: this.scope }, this.options)
        .project<{ name: string }>({ name: 1 })
        .toArray()
      if (names.length >= 2000) throw new Error('Esta festa atingiu o limite de participantes.')
      const name = uniqueName(
        normalizeName(value),
        names.map((g) => g.name),
      )
      const id = randomUUID(),
        token = randomBytes(32).toString('hex')
      await guests.insertOne(
        {
          _id: id,
          scope: this.scope,
          name,
          tokenHash: hashToken(token),
          lastSeen: Date.now(),
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
        this.options,
      )
      return { id, name, token }
    })
  }
  async touchGuest(id: string, now = Date.now()) {
    await this.db
      .collection<GuestRow>('guests')
      .updateOne(
        { _id: id, scope: this.scope, lastSeen: { $lt: now - 15000 } },
        { $set: { lastSeen: now } },
        this.options,
      )
  }
  async renameGuest(id: string, value: string) {
    let name = ''
    await this.mutate(async (state) => {
      const others = await this.db
        .collection<GuestRow>('guests')
        .find({ scope: this.scope, _id: { $ne: id } }, this.options)
        .toArray()
      name = uniqueName(
        normalizeName(value),
        others.map((g) => g.name),
      )
      await this.db
        .collection<GuestRow>('guests')
        .updateOne(
          { _id: id, scope: this.scope },
          { $set: { name, lastSeen: Date.now() } },
          this.options,
        )
      for (const item of [
        ...state.queue,
        ...state.history,
        ...(state.current ? [state.current] : []),
      ]) {
        if (item.guestId === id) item.guestName = name
        for (const singer of item.singers || []) if (singer.id === id) singer.name = name
      }
    })
    return { id, name }
  }
  async guestReactions(id: string): Promise<Record<string, 1 | -1>> {
    const rows = await this.db
      .collection<VoteRow>('votes')
      .find({ scope: this.scope, guestId: id }, this.options)
      .toArray()
    return Object.fromEntries(rows.map((row) => [row.queueId, row.value]))
  }
  async guestVotes(id: string) {
    return Object.entries(await this.guestReactions(id))
      .filter(([, value]) => value === 1)
      .map(([id]) => id)
  }
  async vote(queueId: string, guestId: string, input: boolean | -1 | 0 | 1) {
    const value = typeof input === 'boolean' ? (input ? 1 : 0) : input
    return this.mutate(async (state) => {
      if (
        !(await this.db
          .collection<GuestRow>('guests')
          .findOne(
            { _id: guestId, scope: this.scope, expiresAt: { $gt: new Date() } },
            this.options,
          ))
      )
        throw new Error('Entre na festa para votar.')
      const item = state.queue.find((track) => track.queueId === queueId)
      if (!item || item.origin !== 'human')
        throw new Error('Esta música não está mais disponível para voto.')
      const filter = { scope: this.scope, queueId, guestId }
      const existing = await this.db.collection<VoteRow>('votes').findOne(filter, this.options)
      if (value !== 0 && existing?.value !== value) {
        if (state.queue.some((track) => track.manualOrder !== null))
          throw new Error('O anfitrião está controlando a ordem da fila.')
        if (value === 1 && state.queue[0]?.queueId === queueId)
          throw new Error('Esta música já é a próxima.')
        await this.db
          .collection<VoteRow>('votes')
          .updateOne(filter, { $set: { value } }, { ...this.options, upsert: true })
      } else if (value === 0)
        await this.db.collection<VoteRow>('votes').deleteOne(filter, this.options)
      await this.syncVotes(state)
    })
  }
  async admin(token?: string, _touch = false, now = Date.now()) {
    if (!token) return false
    const row =
      this.context?.row ||
      (await this.db
        .collection<PartyRow>('parties')
        .findOne(
          { _id: this.scope },
          { projection: { admin: 1, partyId: 1, expiresAt: 1, closedAt: 1 } },
        ))
    if (row) assertPartyActive(row as PartyRow)
    return !!row?.admin && now < row.admin.expiresAt && row.admin.tokenHash === hashToken(token)
  }
  async adminExpiresAt(now = Date.now()) {
    const row =
      this.context?.row ||
      (await this.db
        .collection<PartyRow>('parties')
        .findOne(
          { _id: this.scope },
          { projection: { admin: 1, partyId: 1, expiresAt: 1, closedAt: 1 } },
        ))
    return row?.admin && now < row.admin.expiresAt ? row.admin.expiresAt : 0
  }
  async claimAdmin(existing: string | undefined, seconds: number, now = Date.now()) {
    return this.write(async (row) => {
      if (row.admin && row.admin.expiresAt > now)
        return {
          granted: !!existing && row.admin.tokenHash === hashToken(existing),
          token: existing && row.admin.tokenHash === hashToken(existing) ? existing : '',
          expiresAt: row.admin.expiresAt,
        }
      const token = randomBytes(32).toString('hex'),
        expiresAt = now + seconds * 1000
      row.admin = { tokenHash: hashToken(token), expiresAt }
      return { granted: true, token, expiresAt }
    })
  }
  async logout(token?: string) {
    if (!token) return
    await this.write(async (row) => {
      if (row.admin?.tokenHash === hashToken(token)) delete row.admin
    })
  }
  async createDevice(label: string, info: Device['info']) {
    return this.write(async (row) => {
      const devices = this.db.collection<DeviceRow>('devices')
      await devices.deleteMany(
        {
          scope: this.scope,
          lastSeen: { $lt: Date.now() - 86400000 },
          _id: { $ne: row.state.playerId || '' },
        },
        this.options,
      )
      if ((await devices.countDocuments({ scope: this.scope }, this.options)) >= 2000)
        throw new Error('Limite de aparelhos atingido.')
      const id = randomUUID(),
        token = randomBytes(32).toString('hex')
      await devices.insertOne(
        {
          _id: id,
          scope: this.scope,
          tokenHash: hashToken(token),
          label,
          info,
          lastSeen: Date.now(),
        },
        this.options,
      )
      return { id, token }
    })
  }
  async device(token?: string) {
    if (!token) return undefined
    const d = await this.db
      .collection<DeviceRow>('devices')
      .findOne({ scope: this.scope, tokenHash: hashToken(token) }, this.options)
    return d ? { id: d._id } : undefined
  }
  async deviceOnline(id: string) {
    return !!(await this.db
      .collection<DeviceRow>('devices')
      .findOne({ scope: this.scope, _id: id, lastSeen: { $gt: Date.now() - 20000 } }, this.options))
  }
  async touchDevice(id: string, info?: Device['info']) {
    await this.db
      .collection<DeviceRow>('devices')
      .updateOne(
        { scope: this.scope, _id: id },
        { $set: { lastSeen: Date.now(), ...(info ? { info } : {}) } },
        this.options,
      )
  }
  async devices() {
    const rows = await this.db
      .collection<DeviceRow>('devices')
      .find({ scope: this.scope }, this.options)
      .sort({ lastSeen: -1 })
      .toArray()
    return rows.map((d) => ({ id: d._id, label: d.label, lastSeen: d.lastSeen, info: d.info }))
  }
  async renameDevice(id: string, label: string) {
    return (
      await this.db
        .collection<DeviceRow>('devices')
        .updateOne({ scope: this.scope, _id: id }, { $set: { label } }, this.options)
    ).matchedCount
  }
  async removeDevice(id: string) {
    await this.db
      .collection<DeviceRow>('devices')
      .deleteOne({ scope: this.scope, _id: id }, this.options)
  }
  async blockYoutube(id: string, title: string, code: number, now = Date.now()) {
    if (![100, 101, 150].includes(code)) return
    await this.db
      .collection('youtube_blocks')
      .updateOne(
        { scope: this.scope, id },
        { $set: { title, code, expiresAt: new Date(now + 86400000) } },
        { ...this.options, upsert: true },
      )
  }
  async youtubeBlocked(id: string, now = Date.now()) {
    return !!(await this.db
      .collection('youtube_blocks')
      .findOne({ scope: this.scope, id, expiresAt: { $gt: new Date(now) } }, this.options))
  }
  async blockedIds() {
    return new Set(
      (
        await this.db
          .collection('youtube_blocks')
          .find({ scope: this.scope, expiresAt: { $gt: new Date() } })
          .toArray()
      ).map((row) => String(row.id)),
    )
  }
  async consumeQuota(cap: number, now = new Date()) {
    const day = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    const quota = this.db.collection<{ _id: string; searches: number }>('quota')
    try {
      await quota.updateOne({ _id: day }, { $setOnInsert: { searches: 0 } }, { upsert: true })
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e
    }
    return (
      (await quota.updateOne({ _id: day, searches: { $lt: cap } }, { $inc: { searches: 1 } }))
        .modifiedCount === 1
    )
  }
  async currentInvite(store: EncryptedStore<{ token: string; expires: number }>, rotate = false) {
    return this.write(async (row) => {
      const session = this.context!.session
      const saved = rotate ? undefined : await store.get('current', session)
      if (
        saved &&
        row.invite?.tokenHash === hashToken(saved.token) &&
        row.invite.expiresAt > Date.now()
      )
        return saved
      const token = randomBytes(32).toString('base64url')
      const expires = Math.min(Date.now() + 86400000, row.expiresAt?.getTime() || Infinity)
      row.invite = {
        tokenHash: hashToken(token),
        expiresAt: expires,
        version: (row.invite?.version || 0) + 1,
      }
      const value = { token, expires }
      await store.set('current', value, session)
      return value
    })
  }
  async rotateInvite(seconds = 86400) {
    const token = randomBytes(32).toString('base64url')
    await this.write(async (row) => {
      row.invite = {
        tokenHash: hashToken(token),
        expiresAt: Math.min(Date.now() + seconds * 1000, row.expiresAt?.getTime() || Infinity),
        version: (row.invite?.version || 0) + 1,
      }
    })
    return token
  }
  async acceptInvite(token: string) {
    const row = await this.db.collection<PartyRow>('parties').findOne({
      _id: this.scope,
      'invite.tokenHash': hashToken(token),
      'invite.expiresAt': { $gt: Date.now() },
    })
    if (row) assertPartyActive(row)
    return row?.invite
  }
  async inviteVersion() {
    const row = await this.db
      .collection<PartyRow>('parties')
      .findOne({ _id: this.scope }, { projection: { invite: 1 } })
    return row?.invite
  }
}
