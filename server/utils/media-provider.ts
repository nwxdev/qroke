import type { H3Event } from 'h3'
import type { MediaProviderId } from '../../shared/media'
import type { MediaProviderAdapter } from '../core/media-provider'
import { youtubeMediaAdapter } from '../media/youtube'
import { localMediaAdapter } from '../media/local'
const adapters: Partial<Record<MediaProviderId, (event: H3Event) => MediaProviderAdapter>> = {
  youtube: youtubeMediaAdapter,
  local: localMediaAdapter,
}
export function mediaProvider(event: H3Event, provider: MediaProviderId) {
  const factory = adapters[provider]
  if (!factory)
    throw createError({
      statusCode: 501,
      statusMessage: 'Esta plataforma ainda não está conectada ao QRokê.',
    })
  return factory(event)
}
