export interface Track {
  id: string
  source: 'youtube' | 'local'
  title: string
  artist: string
  duration: number
  thumbnail: string
  karaoke: boolean
}
export interface QueueItem extends Track {
  queueId: string
  guestId: string
  guestName: string
  origin: 'human' | 'auto'
  enqueuedAt: number
  round: number
  manualOrder: number | null
}
export interface HistoryItem extends QueueItem {
  playedAt: number
  outcome: 'ended' | 'skipped' | 'error'
}
export interface Device {
  id: string
  label: string
  lastSeen: number
}
export interface PartyState {
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
  devices: Device[]
}
export interface Guest {
  id: string
  name: string
}
