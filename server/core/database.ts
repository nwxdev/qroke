import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { normalizeName, uniqueName, orderQueue } from './rules'
import type { PartyState, Guest, Device, PublicState } from '../../shared/types'
export const initialState = (): PartyState => ({
  revision: 0,
  karaokeDelaySeconds: 5,
  karaokeTransitionMusic: true,
  karaokeLeadSeconds: 0,
  karaokeStartsAt: null,
  volume: 100,
  playbackIssue: null,
  consecutivePlaybackErrors: 0,
  queue: [],
  current: null,
  history: [],
  playerId: null,
  playerReadyAt: 0,
  mode: 'video',
  autoContinue: false,
  paused: false,
  position: 0,
  duration: 0,
  catalogWarning: null,
})
export class PartyDatabase {
  db: Database.Database
  listeners = new Set<() => void>()
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS party (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admins (token TEXT PRIMARY KEY, last_active INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, label TEXT NOT NULL, last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS pin_attempts (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, until_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS quota (day TEXT PRIMARY KEY, searches INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS youtube_blocks (id TEXT PRIMARY KEY, title TEXT NOT NULL, code INTEGER NOT NULL, expires_at INTEGER NOT NULL);

    `)
    const columns = this.db.pragma('table_info(admins)') as { name: string }[]
    if (!columns.some((column) => column.name === 'expires_at')) {
      this.db.transaction(() => {
        this.db.exec('ALTER TABLE admins ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0')
        // Sessões antigas não tinham prazo absoluto nem exclusividade.
        this.db.exec('DELETE FROM admins')
      })()
    }
    const deviceColumns = this.db.pragma('table_info(devices)') as { name: string }[]
    if (!deviceColumns.some((column) => column.name === 'info'))
      this.db.exec("ALTER TABLE devices ADD COLUMN info TEXT NOT NULL DEFAULT '{}'")
    const guestColumns = this.db.pragma('table_info(guests)') as { name: string }[]
    if (!guestColumns.some((column) => column.name === 'last_seen'))
      this.db.exec('ALTER TABLE guests ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0')
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS queue_votes (queue_id TEXT NOT NULL, guest_id TEXT NOT NULL, PRIMARY KEY(queue_id,guest_id))',
    )
    const voteColumns = this.db.pragma('table_info(queue_votes)') as { name: string }[]
    if (!voteColumns.some((column) => column.name === 'value'))
      this.db.exec(
        'ALTER TABLE queue_votes ADD COLUMN value INTEGER NOT NULL DEFAULT 1 CHECK(value IN (-1,1))',
      )
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS one_admin ON admins((1)); PRAGMA user_version=6;',
    )
    this.db.prepare('INSERT OR IGNORE INTO party VALUES (1,?)').run(JSON.stringify(initialState()))
  }
  blockYoutube(id: string, title: string, code: number, now = Date.now()) {
    if (![100, 101, 150].includes(code)) return
    this.db.prepare('DELETE FROM youtube_blocks WHERE expires_at<=?').run(now)
    this.db
      .prepare('INSERT OR REPLACE INTO youtube_blocks VALUES (?,?,?,?)')
      .run(id, title, code, now + 86400000)
  }
  youtubeBlocked(id: string, now = Date.now()) {
    return !!this.db
      .prepare('SELECT 1 FROM youtube_blocks WHERE id=? AND expires_at>?')
      .get(id, now)
  }
  state(): PartyState {
    return JSON.parse(
      (this.db.prepare('SELECT state FROM party WHERE id=1').get() as { state: string }).state,
    )
  }
  mutate(fn: (state: PartyState) => void) {
    const state = this.db.transaction(() => {
      const s = this.state()
      this.syncVotes(s)
      fn(s)
      this.syncVotes(s)
      this.db
        .prepare(
          "DELETE FROM queue_votes WHERE queue_id NOT IN (SELECT json_extract(value,'$.queueId') FROM json_each(?))",
        )
        .run(JSON.stringify(s.queue))
      s.queue = orderQueue(s.queue, [...s.history, ...(s.current ? [s.current] : [])])
      s.revision++
      this.db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(s))
      return s
    })()
    for (const listener of this.listeners) listener()
    return state
  }
  publicState(): PublicState {
    const { history, ...state } = this.state()
    return {
      ...state,
      serverTime: Date.now(),
      canGoBack: history.some((item) => item.outcome !== 'error'),
      guests: this.db
        .prepare('SELECT id,name FROM guests WHERE last_seen>? ORDER BY name')
        .all(Date.now() - 90000) as Guest[],
      devices: this.db
        .prepare(
          'SELECT id,label,last_seen AS lastSeen FROM devices WHERE last_seen>? ORDER BY label',
        )
        .all(Date.now() - 20000) as Device[],
    }
  }
  guest(token: string | undefined): Guest | undefined {
    return token
      ? (this.db.prepare('SELECT id,name FROM guests WHERE token=?').get(token) as
          Guest | undefined)
      : undefined
  }
  createGuest(name: string) {
    return this.db.transaction(() => {
      const names = this.db.prepare('SELECT name FROM guests').all() as { name: string }[]
      const guest = {
        id: randomUUID(),
        name: uniqueName(
          normalizeName(name),
          names.map((n) => n.name),
        ),
        token: randomBytes(32).toString('hex'),
      }
      this.db
        .prepare('INSERT INTO guests(id,token,name,last_seen) VALUES (?,?,?,?)')
        .run(guest.id, guest.token, guest.name, Date.now())
      return guest
    })()
  }
  touchGuest(id: string, now = Date.now()) {
    this.db.prepare('UPDATE guests SET last_seen=? WHERE id=?').run(now, id)
  }
  renameGuest(id: string, value: string) {
    let name = ''
    this.mutate((state) => {
      const others = this.db.prepare('SELECT name FROM guests WHERE id<>?').all(id) as {
        name: string
      }[]
      name = uniqueName(
        normalizeName(value),
        others.map((guest) => guest.name),
      )
      this.db.prepare('UPDATE guests SET name=?,last_seen=? WHERE id=?').run(name, Date.now(), id)
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
  guestVotes(id: string) {
    return (
      this.db.prepare('SELECT queue_id FROM queue_votes WHERE guest_id=? AND value=1').all(id) as {
        queue_id: string
      }[]
    ).map((row) => row.queue_id)
  }
  guestReactions(id: string): Record<string, 1 | -1> {
    const rows = this.db
      .prepare('SELECT queue_id,value FROM queue_votes WHERE guest_id=?')
      .all(id) as { queue_id: string; value: 1 | -1 }[]
    return Object.fromEntries(rows.map((row) => [row.queue_id, row.value]))
  }
  private syncVotes(state: PartyState) {
    const counts = this.db
      .prepare(
        'SELECT queue_id,SUM(value) AS score,SUM(value=1) AS likes,SUM(value=-1) AS dislikes FROM queue_votes GROUP BY queue_id',
      )
      .all() as { queue_id: string; score: number; likes: number; dislikes: number }[]
    const scores = new Map(counts.map((row) => [row.queue_id, row]))
    state.queue = state.queue.map((item) => ({
      ...item,
      votes: scores.get(item.queueId)?.score || 0,
      likes: scores.get(item.queueId)?.likes || 0,
      dislikes: scores.get(item.queueId)?.dislikes || 0,
    }))
  }
  vote(queueId: string, guestId: string, input: boolean | -1 | 0 | 1) {
    const value = typeof input === 'boolean' ? (input ? 1 : 0) : input
    return this.mutate((state) => {
      if (!this.db.prepare('SELECT id FROM guests WHERE id=?').get(guestId))
        throw new Error('Entre na festa para votar.')
      const item = state.queue.find((track) => track.queueId === queueId)
      if (!item || item.origin !== 'human')
        throw new Error('Esta música não está mais disponível para voto.')
      const existing = this.db
        .prepare('SELECT value FROM queue_votes WHERE queue_id=? AND guest_id=?')
        .get(queueId, guestId) as { value: number } | undefined
      if (value !== 0 && existing?.value !== value) {
        if (state.queue.some((track) => track.manualOrder !== null))
          throw new Error('O anfitrião está controlando a ordem da fila.')
        if (value === 1 && state.queue[0]?.queueId === queueId)
          throw new Error('Esta música já é a próxima.')
        this.db
          .prepare(
            'INSERT INTO queue_votes(queue_id,guest_id,value) VALUES (?,?,?) ON CONFLICT(queue_id,guest_id) DO UPDATE SET value=excluded.value',
          )
          .run(queueId, guestId, value)
      } else if (value === 0) {
        this.db
          .prepare('DELETE FROM queue_votes WHERE queue_id=? AND guest_id=?')
          .run(queueId, guestId)
      }
    })
  }
  admin(token: string | undefined, _touch = false, now = Date.now()) {
    if (!token) return false
    const row = this.db.prepare('SELECT expires_at FROM admins WHERE token=?').get(token) as
      { expires_at: number } | undefined
    if (!row || now >= row.expires_at) {
      this.db.prepare('DELETE FROM admins WHERE token=?').run(token)
      return false
    }
    return true
  }
  adminExpiresAt(now = Date.now()) {
    const row = this.db.prepare('SELECT expires_at FROM admins WHERE expires_at>?').get(now) as
      { expires_at: number } | undefined
    return row?.expires_at || 0
  }
  claimAdmin(existing: string | undefined, seconds: number, now = Date.now()) {
    return this.db
      .transaction(() => {
        this.db.prepare('DELETE FROM admins WHERE expires_at<=?').run(now)
        const row = this.db.prepare('SELECT token,expires_at FROM admins').get() as
          { token: string; expires_at: number } | undefined
        if (row)
          return {
            granted: row.token === existing,
            token: row.token === existing ? row.token : '',
            expiresAt: row.expires_at,
          }
        const token = randomBytes(32).toString('hex'),
          expiresAt = now + seconds * 1000
        this.db
          .prepare('INSERT INTO admins(token,last_active,expires_at) VALUES (?,?,?)')
          .run(token, now, expiresAt)
        return { granted: true, token, expiresAt }
      })
      .immediate()
  }
  attempt(ip: string, now = Date.now()) {
    return this.db.transaction(() => {
      const old = this.db.prepare('SELECT count,until_at FROM pin_attempts WHERE ip=?').get(ip) as
        { count: number; until_at: number } | undefined
      if (old && old.until_at > now && old.count >= 5) return false
      const active = old && old.until_at > now
      this.db
        .prepare('INSERT OR REPLACE INTO pin_attempts VALUES (?,?,?)')
        .run(ip, active ? old.count + 1 : 1, active ? old.until_at : now + 60000)
      return true
    })()
  }
  consumeQuota(cap: number, now = new Date()) {
    // Quota do YouTube reinicia à meia-noite no horário do Pacífico.
    const day = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    return this.db.transaction(() => {
      const row = this.db.prepare('SELECT searches FROM quota WHERE day=?').get(day) as
        { searches: number } | undefined
      if ((row?.searches || 0) >= cap) return false
      this.db
        .prepare(
          'INSERT INTO quota VALUES (?,1) ON CONFLICT(day) DO UPDATE SET searches=searches+1',
        )
        .run(day)
      return true
    })()
  }
}
