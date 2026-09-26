import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { normalizeName, uniqueName, orderQueue } from './rules'
import type { PartyState, Guest, Device, PublicState } from '../../shared/types'
export const initialState = (): PartyState => ({
  revision: 0,
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
      PRAGMA user_version=1;
    `)
    this.db.prepare('INSERT OR IGNORE INTO party VALUES (1,?)').run(JSON.stringify(initialState()))
  }
  state(): PartyState {
    return JSON.parse(
      (this.db.prepare('SELECT state FROM party WHERE id=1').get() as { state: string }).state,
    )
  }
  mutate(fn: (state: PartyState) => void) {
    const state = this.db.transaction(() => {
      const s = this.state()
      fn(s)
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
      this.db.prepare('INSERT INTO guests VALUES (?,?,?)').run(guest.id, guest.token, guest.name)
      return guest
    })()
  }
  admin(token: string | undefined, touch = false, now = Date.now()) {
    if (!token) return false
    const row = this.db.prepare('SELECT last_active FROM admins WHERE token=?').get(token) as
      { last_active: number } | undefined
    if (!row || now - row.last_active >= 300000) {
      this.db.prepare('DELETE FROM admins WHERE token=?').run(token)
      return false
    }
    if (touch) this.db.prepare('UPDATE admins SET last_active=? WHERE token=?').run(now, token)
    return true
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
