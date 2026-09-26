import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  it('gera credencial diferente do identificador público e nomes únicos', () => {
    const d = db(),
      a = d.createGuest(' Ana '),
      b = d.createGuest('ana')
    expect(b.name).toBe('ana (2)')
    expect(d.guest(a.id)).toBeUndefined()
    expect(d.guest(a.token)?.id).toBe(a.id)
  })
  it('expira admin em 5 min sem renovar nas leituras', () => {
    const d = db()
    d.db.prepare('INSERT INTO admins VALUES (?,?)').run('secret', 1000)
    expect(d.admin('secret', false, 2000)).toBe(true)
    expect(d.admin('secret', false, 301000)).toBe(false)
    d.db.prepare('INSERT INTO admins VALUES (?,?)').run('new', 1000)
    expect(d.admin('new', true, 300000)).toBe(true)
    expect(d.admin('new', false, 500000)).toBe(true)
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
