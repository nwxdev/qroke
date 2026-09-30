import type { PartyState, Track } from './types'
export const MEDIA_PROVIDERS = ['youtube', 'local', 'spotify', 'deezer'] as const
export type MediaProviderId = (typeof MEDIA_PROVIDERS)[number]
export const MEDIA_CHANNELS = ['music', 'video', 'karaoke'] as const
export type MediaChannel = (typeof MEDIA_CHANNELS)[number]
export type PlaybackKind = 'youtube-embed' | 'audio-file' | 'provider-sdk' | 'external'
export interface MediaDescriptor {
  provider: MediaProviderId
  externalId: string
  channel: MediaChannel
  playback: { kind: PlaybackKind }
}
export interface MediaProviderInfo {
  id: MediaProviderId
  name: string
  enabled: boolean
  channels: readonly MediaChannel[]
  playback: PlaybackKind
  capabilities: { search: boolean; playlists: boolean; account: boolean; directStream: boolean }
}
export const MEDIA_PROVIDER_INFO: readonly MediaProviderInfo[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    enabled: true,
    channels: ['music', 'video', 'karaoke'],
    playback: 'youtube-embed',
    capabilities: { search: true, playlists: true, account: true, directStream: false },
  },
  {
    id: 'local',
    name: 'Biblioteca local',
    enabled: true,
    channels: ['music'],
    playback: 'audio-file',
    capabilities: { search: true, playlists: false, account: false, directStream: true },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    enabled: false,
    channels: ['music'],
    playback: 'provider-sdk',
    capabilities: { search: false, playlists: false, account: false, directStream: false },
  },
  {
    id: 'deezer',
    name: 'Deezer',
    enabled: false,
    channels: ['music'],
    playback: 'external',
    capabilities: { search: false, playlists: false, account: false, directStream: false },
  },
]
export function mediaIdentity(track: Pick<Track, 'source' | 'id'>) {
  return track.source + ':' + track.id
}
export function describeMedia(track: Track, channel?: MediaChannel): MediaDescriptor {
  const provider = MEDIA_PROVIDER_INFO.find((item) => item.id === track.source)
  return {
    provider: track.source,
    externalId: track.id,
    channel: track.karaoke
      ? 'karaoke'
      : track.source === 'local'
        ? 'music'
        : channel || track.media?.channel || 'music',
    playback: { kind: provider?.playback || 'external' },
  }
}
export function normalizeTrack<T extends Track>(
  track: T,
  channel?: MediaChannel,
): T & { media: MediaDescriptor } {
  return { ...track, media: describeMedia(track, channel) }
}
export function normalizePartyMedia(state: PartyState) {
  state.schemaVersion = 2
  if (state.current) state.current = normalizeTrack(state.current)
  state.queue = state.queue.map((item) => normalizeTrack(item))
  state.history = state.history.map((item) => normalizeTrack(item))
  return state
}
