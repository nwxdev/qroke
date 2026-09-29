export interface Track {
  id: string
  source: 'youtube' | 'local'
  title: string
  artist: string
  duration: number
  thumbnail: string
  karaoke: boolean
}
export interface PlaylistLabel {
  id: string
  title: string
}
export interface QueueItem extends Track {
  singers?: Guest[]
  playlist?: PlaylistLabel
  votes?: number
  likes?: number
  dislikes?: number
  queueId: string
  guestId: string
  guestName: string
  origin: 'human' | 'auto'
  enqueuedAt: number
  round: number
  manualOrder: number | null
}
export interface PlaybackIssue {
  queueId: string
  videoId: string
  title: string
  source: Track['source']
  code?: number
  message: string
  halted: boolean
  at: number
}
export interface HistoryItem extends QueueItem {
  errorCode?: number
  errorMessage?: string
  playedAt: number
  outcome: 'ended' | 'skipped' | 'error'
}
export interface DeviceInfo {
  kind: 'phone' | 'tablet' | 'computer' | 'tv' | 'unknown'
  platform: string
  platformVersion: string
  browser: string
  browserVersion: string
  model: string
  appMode: 'browser' | 'standalone'
  view: 'host' | 'player' | 'busca'
  appVersion: string
}
export interface Device {
  info?: DeviceInfo
  id: string
  label: string
  lastSeen: number
}
export interface PartyState {
  karaokeDelaySeconds?: number
  karaokeTransitionMusic?: boolean
  karaokeLeadSeconds?: number
  karaokeStartsAt?: number | null
  playerVolume?: { volume: number; muted: boolean; at: number; deviceId: string } | null
  volume?: number
  playbackIssue?: PlaybackIssue | null
  consecutivePlaybackErrors?: number
  revision: number
  queue: QueueItem[]
  current: QueueItem | null
  history: HistoryItem[]
  playerId: string | null
  playerReadyAt: number
  mode: 'video' | 'music'
  autoContinue: boolean
  paused: boolean
  position: number
  duration: number
  catalogWarning: string | null
}
export interface PublicState extends Omit<PartyState, 'history'> {
  party?: import('./parties').PartyInfo
  serverTime?: number
  devices: Device[]
  guests: Guest[]
  canGoBack: boolean
}
export interface Guest {
  id: string
  name: string
}
