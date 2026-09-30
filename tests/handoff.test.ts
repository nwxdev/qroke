import { describe, expect, it } from 'vitest'
import { assignPlayer, releasePlayer } from '../server/core/handoff'
import { initialState } from '../server/core/initial-state'
describe('player handoff', () => {
  function setup() {
    const s = initialState()
    s.playerId = 'a'
    s.current = { queueId: 'track', duration: 200 } as NonNullable<typeof s.current>
    s.duration = 200
    s.position = 20
    assignPlayer(s, 'b', 10000)
    return s
  }
  it('resumes at the position reported after the old player stops', () => {
    const s = setup()
    expect(s.playerReadyAt).toBe(19000)
    expect(
      releasePlayer(
        s,
        'a',
        { handoffId: s.playerHandoff!.id, queueId: 'track', position: 23 },
        10010,
      ),
    ).toBe(true)
    expect(s.position).toBe(23)
    expect(s.playerReadyAt).toBe(10010)
    expect(s.playerHandoff).toBeNull()
  })
  it('rejects another device, replay, stale ticket and late release', () => {
    const s = setup()
    const input = { handoffId: s.playerHandoff!.id, queueId: 'track', position: 23 }
    expect(releasePlayer(s, 'b', input, 10010)).toBe(false)
    expect(releasePlayer(s, 'a', { ...input, handoffId: 'stale' }, 10010)).toBe(false)
    expect(releasePlayer(s, 'a', input, 19001)).toBe(false)
    expect(s.playerReadyAt).toBe(19000)
    expect(releasePlayer(s, 'a', input, 10010)).toBe(true)
    expect(releasePlayer(s, 'a', input, 10011)).toBe(false)
  })
  it('keeps the barrier when A → B → C changes before A confirms', () => {
    const s = setup(),
      input = { handoffId: s.playerHandoff!.id, queueId: 'track', position: 23 }
    assignPlayer(s, 'c', 10010)
    expect(s.playerHandoff).toBeNull()
    expect(s.playerReadyAt).toBe(19010)
    expect(releasePlayer(s, 'a', input, 10020)).toBe(false)
  })
  it('does not overwrite another track or release a removed player barrier', () => {
    const s = setup(),
      input = { handoffId: s.playerHandoff!.id, queueId: 'track', position: 23 }
    s.current!.queueId = 'next'
    s.position = 0
    expect(releasePlayer(s, 'a', input, 10010)).toBe(true)
    expect(s.position).toBe(0)
    s.playerId = null
    s.playerReadyAt = 30000
    assignPlayer(s, 'd', 20000)
    expect(s.playerHandoff).toBeNull()
    expect(s.playerReadyAt).toBe(30000)
  })
})
