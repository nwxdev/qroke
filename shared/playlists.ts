import type { Track } from './types'
export interface YoutubePlaylist {
  id: string
  title: string
  channel: string
  count: number
  thumbnail: string
}
export interface PlaylistPreview {
  ticket: string
  playlist: YoutubePlaylist
  tracks: Track[]
  inspected: number
  skipped: number
  nextPageToken: string
}
export interface YoutubeStatus {
  publicConfigured: boolean
  oauthConfigured: boolean
  connected: boolean
  connectHere: boolean
  connectOrigin: string
}
