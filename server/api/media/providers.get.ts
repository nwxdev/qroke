import { MEDIA_PROVIDER_INFO, MEDIA_CHANNELS } from '../../../shared/media'
export default defineEventHandler(() => ({
  providers: MEDIA_PROVIDER_INFO,
  channels: MEDIA_CHANNELS,
}))
