import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Sqlite from 'better-sqlite3'
import { PartyDatabase } from '../server/core/database'
const databases: PartyDatabase[] = []
const db = () => {
  const d = new PartyDatabase(':memory:')
  databases.push(d)
  return d
}
afterEach(() => {
  for (const d of databases) d.db.close()
  databases.length = 0
})
describe('SQLite e sessões', () => {
  it('preserva estado após restart e reverte transação interrompida', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qroke-db-')),
      path = join(dir, 'db.sqlite')
    const first = new PartyDatabase(path)
    first.mutate((s) => {
      s.mode = 'music'
    })
    first.db.close()
    const second = new PartyDatabase(path)
    expect(second.state().mode).toBe('music')
    expect(() =>
      second.mutate((s) => {
        s.mode = 'video'
        throw new Error('abort')
      }),
    ).toThrow()
    expect(second.state().mode).toBe('music')
    second.db.close()
    rmSync(dir, { recursive: true })
  })
  it('migra sessões antigas sem alterar o estado da festa', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qroke-db-')),
      path = join(dir, 'legacy.sqlite')
    const original = new PartyDatabase(path)
    original.mutate((s) => {
      s.mode = 'music'
      s.position = 42
    })
    original.db.exec(
      'DROP INDEX one_admin; ALTER TABLE admins DROP COLUMN expires_at; PRAGMA user_version=1;',
    )
    original.db.prepare('INSERT INTO admins VALUES (?,?)').run('legacy-a', Date.now())
    original.db.prepare('INSERT INTO admins VALUES (?,?)').run('legacy-b', Date.now())
    original.db.close()
    const migrated = new PartyDatabase(path)
    expect(migrated.state().mode).toBe('music')
    expect(migrated.state().position).toBe(42)
    expect(migrated.admin('legacy-a')).toBe(false)
    expect(migrated.admin('legacy-b')).toBe(false)
    expect(migrated.claimAdmin(undefined, 120).granted).toBe(true)
    migrated.db.close()
    const check = new Sqlite(path)
    expect(check.pragma('user_version', { simple: true })).toBe(2)
    check.close()
    rmSync(dir, { recursive: true })
  })
  it('gera credencial diferente do identificador público e nomes únicos', () => {
    const d = db(),
      a = d.createGuest(' Ana '),
      b = d.createGuest('ana')
    expect(b.name).toBe('ana (2)')
    expect(d.guest(a.id)).toBeUndefined()
    expect(d.guest(a.token)?.id).toBe(a.id)
  })
  it('expira admin por prazo fixo, sem renovar por leitura, atividade ou novo login', () => {
    const d = db(),
      lease = d.claimAdmin(undefined, 120, 1000)
    expect(lease.granted).toBe(true)
    expect(d.admin(lease.token, false, 2000)).toBe(true)
    expect(d.admin(lease.token, true, 120999)).toBe(true)
    expect(d.claimAdmin(lease.token, 120, 30000).expiresAt).toBe(121000)
    expect(d.admin(lease.token, false, 121000)).toBe(false)
  })
  it('permite apenas um controlador e libera após prazo ou logout', () => {
    const d = db(),
      first = d.claimAdmin(undefined, 120, 1000)
    const denied = d.claimAdmin(undefined, 120, 1001)
    expect(denied.granted).toBe(false)
    expect(denied.token).toBe('')
    expect(d.adminExpiresAt(1001)).toBe(121000)
    const next = d.claimAdmin(undefined, 120, 121000)
    expect(next.granted).toBe(true)
    expect(next.token).not.toBe(first.token)
    expect(d.admin(first.token, false, 121001)).toBe(false)
    expect(d.admin(next.token, false, 121001)).toBe(true)
    d.db.prepare('DELETE FROM admins WHERE token=?').run(next.token)
    expect(d.claimAdmin(undefined, 120, 121002).granted).toBe(true)
  })
  it('bloqueia a sexta tentativa de PIN e libera após um minuto', () => {
    const d = db()
    for (let i = 0; i < 5; i++) expect(d.attempt('ip', 1000 + i)).toBe(true)
    expect(d.attempt('ip', 2000)).toBe(false)
    expect(d.attempt('other', 2000)).toBe(true)
    expect(d.attempt('ip', 61000)).toBe(true)
  })
  it('persiste limite de busca e reinicia no dia do Pacífico', () => {
    const d = db()
    expect(d.consumeQuota(1, new Date('2026-09-25T23:00:00Z'))).toBe(true)
    expect(d.consumeQuota(1, new Date('2026-09-26T01:00:00Z'))).toBe(false)
    expect(d.consumeQuota(1, new Date('2026-09-26T08:00:00Z'))).toBe(true)
  })
})
