import { afterEach, expect, it } from 'vitest'
import { PartyDatabase } from '../server/core/database'
import { previousTrack } from '../server/core/previous'
import { initialState } from '../server/core/database'
import type { QueueItem } from '../shared/types'
const databases: PartyDatabase[] = []
const db = () => {
  const d = new PartyDatabase(':memory:')
  databases.push(d)
  return d
}
const track = (id: string, guestId = 'a'): QueueItem => ({
  id,
  title: id,
  source: 'local',
  artist: 'Artista',
  duration: 180,
  thumbnail: '',
  karaoke: false,
  queueId: id,
  guestId,
  guestName: 'Ana',
  origin: 'human',
  enqueuedAt: Number(id),
  round: 0,
  manualOrder: null,
})
afterEach(() => {
  for (const d of databases) d.db.close()
  databases.length = 0
})
it('edita identidade sem colidir e atualiza pedidos; presença expira sem apagar identidade', () => {
  const d = db(),
    ana = d.createGuest('Ana'),
    bia = d.createGuest('Bia')
  d.mutate((s) => {
    s.queue = [track('1', ana.id)]
    s.current = track('2', ana.id)
    s.history = [{ ...track('3', ana.id), playedAt: 1, outcome: 'ended' }]
  })
  expect(d.renameGuest(ana.id, 'Bia').name).toBe('Bia (2)')
  const s = d.state()
  expect([s.queue[0]!.guestName, s.current!.guestName, s.history[0]!.guestName]).toEqual([
    'Bia (2)',
    'Bia (2)',
    'Bia (2)',
  ])
  expect(() => d.renameGuest(ana.id, 'A')).toThrow()
  d.touchGuest(bia.id, Date.now() - 91000)
  expect(d.publicState().guests.map((g) => g.id)).toEqual([ana.id])
  expect(d.guest(bia.token)?.name).toBe('Bia')
  expect(JSON.stringify(d.publicState())).not.toContain(ana.token)
})
it('votos são únicos, reversíveis, respeitam ordenação manual e removidos com a música', () => {
  const d = db(),
    ana = d.createGuest('Ana'),
    bia = d.createGuest('Bia')
  d.mutate((s) => {
    s.queue = [track('1'), track('2'), track('3')]
  })
  expect(() => d.vote('1', ana.id, true)).toThrow('já é a próxima')
  d.vote('3', ana.id, true)
  d.vote('3', ana.id, true)
  expect(d.state().queue[0]!.queueId).toBe('3')
  expect(d.state().queue[0]!.votes).toBe(1)
  expect(d.guestVotes(ana.id)).toEqual(['3'])
  d.vote('2', bia.id, true)
  expect(d.state().queue[0]!.queueId).toBe('2')
  d.vote('2', bia.id, false)
  expect(d.state().queue[0]!.queueId).toBe('3')
  d.mutate((s) => {
    s.queue = s.queue.map((item, i) => ({ ...item, manualOrder: i }))
  })
  expect(() => d.vote('1', bia.id, true)).toThrow('controlando')
  d.vote('3', ana.id, false)
  d.mutate((s) => {
    s.queue = s.queue.map((item) => ({ ...item, manualOrder: null }))
  })
  expect(d.state().queue[0]!.queueId).toBe('1')
  d.vote('3', bia.id, true)
  d.mutate((s) => {
    s.current = s.queue.shift()!
  })
  expect(d.guestVotes(bia.id)).toEqual([])
  expect(() => d.vote('3', bia.id, true)).toThrow('não está mais')
  expect(() => d.vote('2', 'unknown', true)).toThrow('Entre')
})
it('voltar restaura faixa anterior, preserva a interrompida e invalida ids de eventos atrasados', () => {
  const s = initialState()
  expect(previousTrack(s)).toBe(false)
  s.history = [
    { ...track('1'), playedAt: 1, outcome: 'ended' },
    { ...track('4'), playedAt: 2, outcome: 'error' },
  ]
  s.current = track('2')
  s.queue = [track('3'), track('1')]
  s.position = 50
  s.paused = true
  expect(previousTrack(s)).toBe(true)
  expect(s.current!.id).toBe('1')
  expect(s.current!.queueId).not.toBe('1')
  expect(s.queue.map((t) => t.id)).toEqual(['2', '3'])
  expect(s.queue[0]!.queueId).not.toBe('2')
  expect(s.queue[0]!.manualOrder).toBeLessThan(0)
  expect(s.position).toBe(0)
  expect(s.paused).toBe(false)
  expect(previousTrack(s)).toBe(false)
})
