import type { MediaChannel, MediaProviderInfo } from '../../shared/media'
import type { Track } from '../../shared/types'
/** Credentials and expiring stream URLs stay inside the adapter, never in a queue item. */
export interface MediaProviderAdapter {
  info: MediaProviderInfo
  search(query: string, channel: MediaChannel): Promise<Track[]>
  resolve(id: string, channel: MediaChannel): Promise<Track | undefined>
}
