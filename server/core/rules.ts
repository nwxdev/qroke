import type { HistoryItem, QueueItem, Track } from '../../shared/types'
export function orderQueue(items: QueueItem[], served: QueueItem[] = []): QueueItem[] {
  const rounds = new Map<string, number>()
  const humans = served.filter((item) => item.origin === 'human')
  const base = humans.at(-1)?.round || 0
  for (const item of humans)
    rounds.set(item.guestId, Math.max(rounds.get(item.guestId) || 0, item.round + 1))
  const annotated = [...items]
    .sort((a, b) => a.enqueuedAt - b.enqueuedAt || a.queueId.localeCompare(b.queueId))
    .map((item) => {
      const round = Math.max(rounds.get(item.guestId) ?? base, base)
      rounds.set(item.guestId, round + 1)
      return { ...item, round }
    })
  return annotated.sort(
    (a, b) =>
      Number(a.origin === 'auto') - Number(b.origin === 'auto') ||
      Number(b.karaoke) - Number(a.karaoke) ||
      (a.manualOrder ?? Infinity) - (b.manualOrder ?? Infinity) ||
      (b.votes || 0) - (a.votes || 0) ||
      a.round - b.round ||
      a.enqueuedAt - b.enqueuedAt ||
      a.queueId.localeCompare(b.queueId),
  )
}
export function reorderQueue(items: QueueItem[], ids: string[]): QueueItem[] {
  if (
    ids.length !== items.length ||
    new Set(ids).size !== items.length ||
    ids.some((id) => !items.some((i) => i.queueId === id))
  )
    throw new Error('A fila mudou. Atualize e tente novamente.')
  const ordered = ids.map((id) => items.find((i) => i.queueId === id)!)
  let auto = false
  for (const item of ordered) {
    if (item.origin === 'auto') auto = true
    else if (auto) throw new Error('Escolhas humanas devem ficar antes da continuação.')
  }
  for (let index = 1; index < ordered.length; index++) {
    const previous = ordered[index - 1]!,
      current = ordered[index]!
    if (previous.origin === current.origin && !previous.karaoke && current.karaoke)
      throw new Error('Os pedidos de karaokê vêm antes das músicas comuns.')
  }
  return ordered.map((item, index) => ({ ...item, manualOrder: index }))
}
export function normalizeName(value: string) {
  const name = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .normalize('NFC')
  if (Array.from(name).length < 2 || Array.from(name).length > 20)
    throw new Error('Use um nome de 2 a 20 caracteres.')
  return name
}
export function uniqueName(name: string, names: string[]) {
  const taken = new Set(names.map((n) => n.toLocaleLowerCase('pt-BR')))
  let candidate = name,
    suffix = 1
  while (taken.has(candidate.toLocaleLowerCase('pt-BR'))) {
    const end = ' (' + ++suffix + ')'
    candidate =
      Array.from(name)
        .slice(0, 20 - end.length)
        .join('') + end
  }
  return candidate
}
export function normalizeQuery(query: string) {
  return query.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}
export function karaokeQueries(query: string) {
  return ['karaoke ' + normalizeQuery(query), 'karaokê ' + normalizeQuery(query)]
}
export function recommendation(
  candidates: Track[],
  history: HistoryItem[],
  queue: Track[],
  now = Date.now(),
) {
  const excluded = new Set([
    ...queue.map((t) => t.source + ':' + t.id),
    ...history
      .filter((h) => h.outcome !== 'ended' || now - h.playedAt < 3600000)
      .map((t) => t.source + ':' + t.id),
  ])
  // A ordem do catálogo já reflete a última faixa usada como referência do rádio.
  return candidates.find((track) => !excluded.has(track.source + ':' + track.id))
}
