import { randomUUID } from 'node:crypto'
import type { PartyState } from '../../shared/types'
export function assignPlayer(state: PartyState, deviceId: string, now = Date.now()) {
  if (state.playerId === deviceId) return
  const previous = state.playerId
  const waiting = state.playerReadyAt > now
  state.playerReadyAt = Math.max(state.playerReadyAt || 0, previous ? now + 9000 : now)
  // A second transfer must not release the barrier protecting an earlier player.
  state.playerHandoff =
    previous && !waiting
      ? {
          id: randomUUID(),
          from: previous,
          to: deviceId,
          queueId: state.current?.queueId || null,
        }
      : null
  state.playerId = deviceId
  state.playerVolume = null
}
export function releasePlayer(
  state: PartyState,
  deviceId: string,
  release: { handoffId: string; queueId: string | null; position: number },
  now = Date.now(),
) {
  const transfer = state.playerHandoff
  if (
    !transfer ||
    transfer.id !== release.handoffId ||
    transfer.from !== deviceId ||
    transfer.to !== state.playerId ||
    transfer.queueId !== release.queueId ||
    state.playerReadyAt <= now
  )
    return false
  if (state.current && state.current.queueId === release.queueId)
    state.position = Math.min(release.position, state.duration || 86400)
  state.playerReadyAt = now
  state.playerHandoff = null
  return true
}
