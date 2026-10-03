import { randomUUID } from 'node:crypto'
import { orderQueue } from './rules'
import type { PartyState } from '../../shared/types'
export function prepareKaraoke(state: PartyState) {
  state.karaokeLeadSeconds = state.current?.karaoke ? (state.karaokeDelaySeconds ?? 10) : 0
  state.karaokeStartsAt = null
}
export function startNext(state: PartyState) {
  if (!state.current && state.playerId && !state.playbackIssue?.halted) {
    state.queue = orderQueue(state.queue, state.history)
    state.current = state.queue.shift() || null
    state.queue = orderQueue(state.queue, [
      ...state.history,
      ...(state.current ? [state.current] : []),
    ])
    prepareKaraoke(state)
    state.position = 0
    state.duration = state.current?.duration || 0
    state.paused = false
  }
}
export function finishTrack(
  state: PartyState,
  outcome: 'ended' | 'skipped' | 'error',
  code?: number,
  message?: string,
) {
  if (state.current)
    state.history.push({
      ...state.current,
      playedAt: Date.now(),
      outcome,
      ...(outcome === 'error' ? { errorCode: code, errorMessage: message } : {}),
    })
  state.current = null
  state.position = 0
  state.duration = 0
  startNext(state)
}
export function clearPlaybackIssue(state: PartyState) {
  state.playbackIssue = null
  state.consecutivePlaybackErrors = 0
}
export function skipTrack(state: PartyState, queueId: string) {
  if (state.current?.queueId !== queueId) return false
  clearPlaybackIssue(state)
  finishTrack(state, 'skipped')
  return true
}
export function retryTrack(state: PartyState, queueId: string) {
  if (state.current?.queueId !== queueId) return false
  clearPlaybackIssue(state)
  state.current = { ...state.current, queueId: randomUUID() }
  prepareKaraoke(state)
  state.position = 0
  state.duration = state.current.duration
  state.paused = false
  return true
}
export function playerFailure(state: PartyState, queueId: string, code?: number) {
  const track = state.current
  if (!track || track.queueId !== queueId || state.playbackIssue?.halted) return false
  const unavailable = track.source === 'youtube' && [2, 100, 101, 150].includes(code || 0)
  const messages: Record<number, string> = {
    2: 'O YouTube recusou o identificador deste vídeo.',
    5: 'O navegador não conseguiu reproduzir este vídeo pelo player HTML5.',
    100: 'O vídeo foi removido, é privado ou não está disponível no YouTube.',
    101: 'O YouTube bloqueou a reprodução desta versão em players incorporados.',
    150: 'O YouTube bloqueou a reprodução desta versão em players incorporados.',
    153: 'O YouTube não recebeu a identificação do site. Abra o QRokê no Chrome ou confira os bloqueadores de privacidade.',
  }
  const message =
    track.source === 'local'
      ? 'Não foi possível reproduzir este arquivo de áudio no aparelho.'
      : messages[code || 0] || 'O YouTube não conseguiu iniciar o vídeo neste aparelho.'
  const count = (state.consecutivePlaybackErrors || 0) + 1
  const halted = !unavailable || count >= 2
  state.consecutivePlaybackErrors = count
  state.playbackIssue = {
    queueId,
    videoId: track.id,
    title: track.title,
    source: track.source,
    code,
    message,
    halted,
    at: Date.now(),
  }
  if (halted) state.paused = true
  else finishTrack(state, 'error', code, message)
  return true
}
