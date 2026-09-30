import type { MediaProviderAdapter } from '../core/media-provider'
import { MEDIA_PROVIDER_INFO, normalizeTrack } from '../../shared/media'
export function localMediaAdapter(): MediaProviderAdapter {
  return {
    info: MEDIA_PROVIDER_INFO.find((item) => item.id === 'local')!,
    async search(query) {
      return (await library()).search(query).map((track) => normalizeTrack(track))
    },
    async resolve(id) {
      const track = (await library()).files.get(id)?.track
      return track && normalizeTrack(track)
    },
  }
}
