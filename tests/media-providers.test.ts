import { describe, expect, it } from 'vitest'
import {
  describeMedia,
  mediaIdentity,
  normalizePartyMedia,
  MEDIA_PROVIDER_INFO,
} from '../shared/media'
import { initialState } from '../server/core/initial-state'
import type { Track } from '../shared/types'
const track = (source: Track['source']): Track => ({
  id: 'same-id',
  source,
  title: 'Song',
  artist: 'Artist',
  duration: 20,
  thumbnail: '',
  karaoke: false,
})
describe('multi-provider media', () => {
  it('keeps identities distinct and does not assume that every provider is YouTube', () => {
    expect(mediaIdentity(track('youtube'))).not.toBe(mediaIdentity(track('spotify')))
    expect(describeMedia(track('youtube')).playback.kind).toBe('youtube-embed')
    expect(describeMedia(track('local')).playback.kind).toBe('audio-file')
    expect(describeMedia(track('spotify')).playback.kind).toBe('provider-sdk')
    expect(MEDIA_PROVIDER_INFO.filter((p) => p.enabled).map((p) => p.id)).toEqual([
      'youtube',
      'local',
    ])
  })
  it('upgrades old party data idempotently without losing queue state', () => {
    const state = initialState()
    delete state.schemaVersion
    state.current = {
      ...track('youtube'),
      karaoke: true,
      queueId: 'current',
      guestId: 'g',
      guestName: 'Ana',
      enqueuedAt: 1,
      origin: 'human',
      round: 0,
      manualOrder: null,
    }
    state.queue = [{ ...state.current, ...track('local'), queueId: 'next' }]
    state.position = 12
    normalizePartyMedia(state)
    const once = JSON.stringify(state)
    normalizePartyMedia(state)
    expect(JSON.stringify(state)).toBe(once)
    expect(state.current?.media?.channel).toBe('karaoke')
    expect(state.queue[0]?.media?.provider).toBe('local')
    expect(state.position).toBe(12)
    expect(state.schemaVersion).toBe(2)
  })
})
