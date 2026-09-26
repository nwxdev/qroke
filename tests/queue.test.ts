import { describe, expect, it } from 'vitest'
import {
  orderQueue,
  reorderQueue,
  normalizeName,
  uniqueName,
  normalizeQuery,
  karaokeQueries,
  recommendation,
} from '../server/core/rules'
import type { QueueItem, HistoryItem } from '../shared/types'
const item = (queueId: string, guestId: string, enqueuedAt: number, extra = {}): QueueItem => ({
  id: queueId,
  source: 'youtube',
  title: queueId,
  artist: guestId,
  duration: 180,
  thumbnail: '',
  karaoke: false,
  queueId,
  guestId,
  guestName: guestId,
  origin: 'human',
  enqueuedAt,
  round: 0,
  manualOrder: null,
  ...extra,
})
describe('rodízio', () => {
  it('intercala convidados mesmo com rajadas e empates', () => {
    expect(
      orderQueue([
        item('a1', 'Ana', 1),
        item('a2', 'Ana', 2),
        item('a3', 'Ana', 3),
        item('b1', 'Bruno', 4),
        item('b2', 'Bruno', 5),
        item('c1', 'Caio', 6),
      ]).map((x) => x.id),
    ).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3'])
  })
  it('preserva o rodízio ao consumir a fila, sem favorecer quem chegou primeiro', () => {
    let queue = orderQueue([
      item('a1', 'Ana', 1),
      item('a2', 'Ana', 2),
      item('a3', 'Ana', 3),
      item('b1', 'Bruno', 4),
      item('b2', 'Bruno', 5),
    ])
    const served: QueueItem[] = []
    while (queue.length) {
      served.push(queue.shift()!)
      queue = orderQueue(queue, served)
    }
    expect(served.map((t) => t.id)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3'])
  })
  it('recalcula rounds após remoção e mantém humanos antes de auto manual', () => {
    const q = orderQueue([
      item('a2', 'Ana', 2),
      item('b1', 'Bruno', 3),
      item('x', 'auto', 0, { origin: 'auto', manualOrder: 0 }),
    ])
    expect(q.map((x) => x.id)).toEqual(['a2', 'b1', 'x'])
    expect(q[0]?.round).toBe(0)
  })
  it('preserva a permutação manual com novas músicas e restaura rodízio', () => {
    const q = reorderQueue(
      [item('a1', 'Ana', 1), item('a2', 'Ana', 2), item('b1', 'Bruno', 3)],
      ['a2', 'b1', 'a1'],
    )
    expect(orderQueue([...q, item('c1', 'Caio', 4)]).map((x) => x.id)).toEqual([
      'a2',
      'b1',
      'a1',
      'c1',
    ])
    expect(orderQueue(q.map((x) => ({ ...x, manualOrder: null }))).map((x) => x.id)).toEqual([
      'a1',
      'b1',
      'a2',
    ])
  })
  it('recusa permutação incompleta, duplicada ou com camada automática na frente', () => {
    const q = [item('a', 'Ana', 1), item('b', 'Bruno', 2)]
    expect(() => reorderQueue(q, ['a', 'a'])).toThrow()
    expect(() => reorderQueue(q, ['a'])).toThrow()
    expect(() =>
      reorderQueue([...q, item('x', 'auto', 3, { origin: 'auto' })], ['x', 'a', 'b']),
    ).toThrow()
  })
})
describe('entrada e busca', () => {
  it('normaliza controles, espaços e nomes Unicode', () => {
    expect(normalizeName('  An\u0000a  ')).toBe('Ana')
    for (const name of ['', ' ', 'A', 'a'.repeat(21)]) expect(() => normalizeName(name)).toThrow()
    expect(uniqueName('Ana', ['ana', 'Ana (2)'])).toBe('Ana (3)')
    expect(uniqueName('a'.repeat(20), ['a'.repeat(20)]).length).toBeLessThanOrEqual(20)
  })
  it('normaliza consulta e tenta as duas grafias do karaokê', () => {
    expect(normalizeQuery('  Evidências   AO VIVO ')).toBe('evidências ao vivo')
    expect(karaokeQueries('Evidências')).toEqual(['karaoke evidências', 'karaokê evidências'])
  })
})
describe('continuação', () => {
  it('deduplica uma hora, nunca repete skip e reduz peso do artista', () => {
    const now = 10_000_000
    const history: HistoryItem[] = [
      { ...item('a', 'Ana', 1), playedAt: now - 1000, outcome: 'ended' },
      { ...item('b', 'Bruno', 2), playedAt: 1, outcome: 'skipped' },
    ]
    expect(
      recommendation(
        [item('a', 'Ana', 1), item('b', 'Bruno', 2), item('c', 'Bruno', 3), item('d', 'Ana', 4)],
        history,
        [],
        now,
      )?.id,
    ).toBe('d')
    expect(recommendation([item('a', 'Ana', 1)], history, [], now)).toBeUndefined()
  })
})
