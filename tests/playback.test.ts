import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { initialState } from '../server/core/database'
import {
  skipTrack,
  finishTrack,
  playerFailure,
  retryTrack,
  clearPlaybackIssue,
} from '../server/core/playback'
const track = (n: number) => ({
  id: String(n).padStart(11, '0'),
  queueId: randomUUID(),
  source: 'youtube' as const,
  title: 'Faixa ' + n,
  artist: 'Artista',
  duration: 30,
  thumbnail: '',
  karaoke: false,
  guestId: 'guest',
  guestName: 'Ana',
  origin: 'human' as const,
  enqueuedAt: n,
  round: 0,
  manualOrder: null,
})
const setup = () => ({
  ...initialState(),
  playerId: randomUUID(),
  current: track(1),
  queue: [track(2), track(3), track(4)],
})
describe('transições do player', () => {
  it('duplicatas de pular e comandos atrasados após ended não consomem a próxima', () => {
    const s = setup(),
      first = s.current.queueId
    expect(skipTrack(s, first)).toBe(true)
    expect(skipTrack(s, first)).toBe(false)
    expect(s.current?.title).toBe('Faixa 2')
    const second = s.current!.queueId
    finishTrack(s, 'ended')
    expect(skipTrack(s, second)).toBe(false)
    expect(playerFailure(s, second, 150)).toBe(false)
    expect(s.current?.title).toBe('Faixa 3')
    expect(s.history.map((t) => t.outcome)).toEqual(['skipped', 'ended'])
  })
  it('registra recusa específica, mas interrompe uma cascata preservando a fila', () => {
    const s = setup()
    playerFailure(s, s.current.queueId, 150)
    expect(s.current?.title).toBe('Faixa 2')
    expect(s.history[0]?.errorCode).toBe(150)
    playerFailure(s, s.current!.queueId, 101)
    expect(s.playbackIssue?.halted).toBe(true)
    expect(s.paused).toBe(true)
    expect(s.current?.title).toBe('Faixa 2')
    expect(s.queue.map((t) => t.title)).toEqual(['Faixa 3', 'Faixa 4'])
    expect(playerFailure(s, s.current!.queueId, 150)).toBe(false)
    const failed = s.current!.queueId
    expect(retryTrack(s, failed)).toBe(true)
    expect(s.current?.queueId).not.toBe(failed)
    expect(s.paused).toBe(false)
    expect(s.playbackIssue).toBe(null)
    expect(playerFailure(s, failed, 150)).toBe(false)
  })
  it.each([5, 153, undefined])('erro de aparelho ou desconhecido %s não avança', (code) => {
    const s = setup(),
      id = s.current.queueId
    playerFailure(s, id, code)
    expect(s.current?.queueId).toBe(id)
    expect(s.queue).toHaveLength(3)
    expect(s.history).toHaveLength(0)
    expect(s.playbackIssue?.halted).toBe(true)
  })
  it('sucesso entre falhas reinicia a contagem e volume persiste ao trocar música', () => {
    const s = setup()
    s.volume = 37
    playerFailure(s, s.current.queueId, 150)
    clearPlaybackIssue(s)
    playerFailure(s, s.current!.queueId, 150)
    expect(s.current?.title).toBe('Faixa 3')
    expect(s.playbackIssue?.halted).toBe(false)
    expect(s.volume).toBe(37)
  })
})
