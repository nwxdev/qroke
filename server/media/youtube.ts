import type { H3Event } from 'h3'
import type { MediaProviderAdapter } from '../core/media-provider'
import { MEDIA_PROVIDER_INFO, normalizeTrack } from '../../shared/media'
export function youtubeMediaAdapter(event: H3Event): MediaProviderAdapter {
  return {
    info: MEDIA_PROVIDER_INFO.find((item) => item.id === 'youtube')!,
    async search(query, channel) {
      return (await (await catalog(event)).search(query, channel === 'karaoke')).map((track) =>
        normalizeTrack(track, channel),
      )
    },
    async resolve(id, channel) {
      if (await party(event).youtubeBlocked(id))
        throw createError({
          statusCode: 409,
          statusMessage: 'Esta versão ficou indisponível. Busque outra versão da música.',
        })
      const track = await (await catalog(event)).selected(id, channel === 'karaoke')
      return track && normalizeTrack(track, channel)
    },
  }
}
