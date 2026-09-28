import { randomUUID } from 'node:crypto'
import { startNext as nextTrack, finishTrack as completeTrack } from '../core/playback'
import { artistWeights, recommendation } from '../core/rules'
import type { PartyState, Track } from '../../shared/types'
export function startNext(s: PartyState) {
  nextTrack(s)
}
export function finishTrack(s: PartyState, outcome: 'ended' | 'skipped' | 'error') {
  completeTrack(s, outcome)
}
let continuing: Promise<void> | undefined
export function continueParty() {
  return (continuing ||= findContinuation()
    .catch(() => {
      publishWarning(
        'Não foi possível continuar automaticamente. Adicione uma faixa ou tente novamente.',
      )
    })
    .finally(() => {
      continuing = undefined
    }))
}
async function findContinuation() {
  const initial = party().state()
  if (
    !initial.autoContinue ||
    initial.current ||
    initial.queue.length ||
    !initial.playerId ||
    initial.playbackIssue?.halted
  )
    return
  const last = initial.history.at(-1)
  if (!last) return
  let candidates: Track[] = []
  if (last.source === 'youtube') {
    try {
      candidates = await catalog().related(last.id)
    } catch {}
    if (!recommendation(candidates, initial.history, initial.queue)) {
      const artists = [...artistWeights(initial.history)].sort((a, b) => b[1] - a[1]).slice(0, 3)
      for (const [artist] of artists) {
        try {
          candidates.push(...(await catalog().search(artist)))
        } catch {}
        if (recommendation(candidates, initial.history, initial.queue)) break
      }
    }
  }
  candidates.push(
    ...(await library()).search(''),
    ...initial.history.filter((h) => h.outcome === 'ended'),
  )
  // Reconfere após I/O: uma escolha humana pode ter chegado durante a busca.
  party().mutate((s) => {
    if (!s.autoContinue || s.current || s.queue.length || s.playbackIssue?.halted) return
    const track = recommendation(candidates, s.history, s.queue)
    if (!track) return
    s.queue.push({
      ...track,
      queueId: randomUUID(),
      guestId: 'auto',
      guestName: 'Rádio da festa',
      origin: 'auto',
      playlist: undefined,
      votes: 0,
      enqueuedAt: Date.now(),
      round: 0,
      manualOrder: null,
    })
    startNext(s)
  })
}
