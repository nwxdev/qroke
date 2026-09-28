import YTMusic from 'ytmusic-api'
import { youtubeAvailable, youtubeRegion, type YoutubeAvailability } from './youtube-availability'
import type { Track } from '../../shared/types'
import { normalizeQuery, karaokeQueries } from './rules'
type RawTrack = {
  videoId: string
  name: string
  artist?: { name: string }
  duration?: number | null
  thumbnails?: { url: string }[]
}
export interface CatalogProvider {
  searchSongs(query: string): Promise<RawTrack[]>
  searchVideos(query: string): Promise<RawTrack[]>
  getUpNexts(id: string): Promise<RawTrack[]>
}
export function mapTrack(raw: RawTrack, karaoke = false): Track {
  return {
    id: raw.videoId,
    source: 'youtube',
    title: raw.name,
    artist: raw.artist?.name || 'YouTube',
    duration: raw.duration || 0,
    thumbnail: raw.thumbnails?.at(-1)?.url || '',
    karaoke,
  }
}
export async function deadline<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tempo limite do catálogo.')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer!)
  }
}
export function musicProvider(region = 'BR'): CatalogProvider {
  const api = new YTMusic()
  let init: Promise<unknown> | undefined
  const ready = () =>
    (init ||= deadline(api.initialize({ GL: youtubeRegion(region), HL: 'pt' })).catch((e) => {
      init = undefined
      throw e
    }))
  return {
    async searchSongs(q) {
      await ready()
      return deadline(api.searchSongs(q))
    },
    async searchVideos(q) {
      await ready()
      return deadline(api.searchVideos(q))
    },
    async getUpNexts(id) {
      await ready()
      return (await deadline(api.getUpNexts(id))).map((t) => ({
        videoId: t.videoId,
        name: t.title,
        artist: t.artists,
        duration: t.duration,
        thumbnails: t.thumbnails,
      }))
    },
  }
}
type Video = YoutubeAvailability & {
  id: string
  status: { embeddable: boolean; privacyStatus: string }
  snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } }
  contentDetails: { duration: string }
}
export function isoDuration(value: string) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0
}
export class Catalog {
  cache = new Map<string, { expires: number; tracks: Track[]; warning: string | null }>()
  tracks = new Map<string, { expires: number; track: Track }>()
  inflight = new Map<string, Promise<Track[]>>()
  constructor(
    public provider: CatalogProvider,
    public key: string,
    public reserve: () => boolean,
    public warn: (message: string | null) => void,
    public http: typeof fetch = fetch,
    public options: { region?: string; unavailable?: (id: string) => boolean } = {},
  ) {}
  available(tracks: Track[]) {
    return tracks.filter((track) => !this.options.unavailable?.(track.id))
  }
  async official(path: string, params: Record<string, string>) {
    const url = new URL('https://www.googleapis.com/youtube/v3/' + path)
    url.search = new URLSearchParams({ ...params, key: this.key }).toString()
    const response = await this.http(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: { errors?: { reason: string }[]; details?: { reason: string }[] }
      }
      const reasons = [...(data.error?.errors || []), ...(data.error?.details || [])].map(
        (e) => e.reason,
      )
      const messages: Record<string, string> = {
        API_KEY_INVALID: 'YOUTUBE_API_KEY inválida. Substitua a chave no servidor.',
        SERVICE_DISABLED: 'Habilite YouTube Data API v3 no projeto da chave.',
        accessNotConfigured: 'Habilite YouTube Data API v3 no projeto da chave.',
        API_KEY_IP_ADDRESS_BLOCKED: 'A chave não permite o IP público de saída deste servidor.',
        API_KEY_HTTP_REFERRER_BLOCKED:
          'A chave usa restrição de navegador. Configure uma chave para chamadas do servidor.',
        quotaExceeded: 'A quota oficial do YouTube foi esgotada.',
        dailyLimitExceeded: 'O limite diário do projeto YouTube foi atingido.',
      }
      throw new Error(
        reasons.map((r) => messages[r]).find(Boolean) ||
          'YouTube oficial indisponível. Verifique chave e quota.',
      )
    }
    return response.json()
  }
  async validate(tracks: Track[]) {
    tracks = this.available(tracks)
    if (!this.key || !tracks.length) return tracks
    const data = (await this.official('videos', {
      part: 'status,snippet,contentDetails',
      id: tracks
        .slice(0, 50)
        .map((t) => t.id)
        .join(','),
    })) as { items: Video[] }
    return tracks.flatMap((track) => {
      const video = data.items.find(
        (v) => v.id === track.id && youtubeAvailable(v, this.options.region),
      )
      return video
        ? [
            {
              ...track,
              title: video.snippet.title,
              artist: video.snippet.channelTitle,
              duration: isoDuration(video.contentDetails.duration),
            },
          ]
        : []
    })
  }
  remember(tracks: Track[]) {
    tracks = this.available(tracks)
    for (const track of tracks)
      this.tracks.set(track.id + ':' + track.karaoke, { track, expires: Date.now() + 3600000 })
    while (this.tracks.size > 10000) this.tracks.delete(this.tracks.keys().next().value!)
    return tracks
  }
  selected(id: string, karaoke: boolean) {
    const cached = this.tracks.get(id + ':' + karaoke)
    return cached && cached.expires > Date.now() && !this.options.unavailable?.(id)
      ? cached.track
      : undefined
  }
  async search(query: string, karaoke = false) {
    const q = normalizeQuery(query),
      cacheKey = q + ':' + karaoke
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      this.warn(cached.warning)
      return this.available(cached.tracks)
    }
    const pending = this.inflight.get(cacheKey)
    if (pending) return this.available(await pending)
    if (this.inflight.size >= 4) throw new Error('Catálogo ocupado. Tente novamente em instantes.')
    const request = this.load(q, karaoke)
      .then(({ tracks, warning }) => {
        this.cache.set(cacheKey, { tracks, warning, expires: Date.now() + 300000 })
        while (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!)
        return tracks
      })
      .finally(() => this.inflight.delete(cacheKey))
    this.inflight.set(cacheKey, request)
    return this.available(await request)
  }
  async versions(q: string) {
    const results = await Promise.allSettled([
      this.provider.searchSongs(q),
      this.provider.searchVideos(q),
    ])
    if (results.every((result) => result.status === 'rejected'))
      throw new Error('Catálogo indisponível.')
    const lists = results.map((result) => (result.status === 'fulfilled' ? result.value : []))
    // Intercala gravações e videoclipes para oferecer outras versões sem substituir a escolha.
    return Array.from({ length: Math.max(...lists.map((list) => list.length)) }, (_, index) =>
      lists.flatMap((list) => (list[index] ? [list[index]!] : [])),
    ).flat()
  }
  async load(q: string, karaoke: boolean) {
    let tracks: Track[],
      warning: string | null = null
    try {
      const raw = karaoke
        ? (
            await Promise.all(karaokeQueries(q).map((query) => this.provider.searchVideos(query)))
          ).flat()
        : await this.versions(q)
      tracks = [...new Map(raw.map((t) => [t.videoId, mapTrack(t, karaoke)])).values()]
        .filter((t) => /^[\w-]{11}$/.test(t.id) && !this.options.unavailable?.(t.id))
        .slice(0, 24)
    } catch {
      warning = 'Catálogo principal indisponível; busca oficial de emergência em uso.'
      this.warn(warning)
      if (!this.key)
        throw new Error(
          'Busca indisponível. A biblioteca local continua disponível; configure YOUTUBE_API_KEY para habilitar a reserva.',
        )
      if (!this.reserve())
        throw new Error('Limite diário da busca de emergência atingido. Use a biblioteca local.')
      const data = (await this.official('search', {
        part: 'snippet',
        type: 'video',
        videoEmbeddable: 'true',
        regionCode: youtubeRegion(this.options.region),
        maxResults: '20',
        q: karaoke ? karaokeQueries(q)[0]! : q,
      })) as {
        items: {
          id: { videoId: string }
          snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } }
        }[]
      }
      tracks = data.items.map((t) => ({
        id: t.id.videoId,
        source: 'youtube',
        title: t.snippet.title,
        artist: t.snippet.channelTitle,
        duration: 0,
        thumbnail: t.snippet.thumbnails.medium?.url || '',
        karaoke,
      }))
    }
    try {
      tracks = await this.validate(tracks)
    } catch (error) {
      this.warn('Validação oficial indisponível: ' + (error as Error).message)
      throw error
    }
    this.warn(warning)
    return { tracks: this.remember(this.available(tracks)), warning }
  }
  async related(id: string) {
    return this.remember(
      await this.validate(
        (await this.provider.getUpNexts(id)).slice(0, 24).map((t) => mapTrack(t)),
      ),
    )
  }
}
