import { randomUUID } from 'node:crypto'
import type { PartyState } from '../../shared/types'
export function previousTrack(state: PartyState) {
  const index = state.history.findLastIndex((item) => item.outcome !== 'error')
  if (index < 0) return false
  const previous = state.history.splice(index, 1)[0]!
  // Voltar já atende um eventual novo pedido da mesma faixa; não deixe uma cópia pendente.
  state.queue = state.queue.filter(
    (item) => item.source !== previous.source || item.id !== previous.id,
  )
  if (state.current) {
    const firstOrder = Math.min(0, ...state.queue.map((item) => item.manualOrder ?? 0))
    state.queue.unshift({
      ...state.current,
      queueId: randomUUID(),
      votes: 0,
      manualOrder: firstOrder - 1,
      enqueuedAt: Date.now(),
    })
  }
  const { playedAt: _playedAt, outcome: _outcome, ...track } = previous
  state.current = { ...track, queueId: randomUUID(), votes: 0, manualOrder: null }
  state.position = 0
  state.duration = track.duration
  state.paused = false
  return true
}
