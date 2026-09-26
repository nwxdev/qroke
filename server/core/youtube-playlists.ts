import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { PartyState, Track } from '../../shared/types'
import type { PlaylistPreview, YoutubePlaylist } from '../../shared/playlists'

export const YOUTUBE_READONLY = 'https://www.googleapis.com/auth/youtube.readonly'
export const ACCOUNT_SECONDS = 8 * 60 * 60
const secret = () => randomBytes(32).toString('base64url')
export class PlaylistError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}
export function playlistId(input: string) {
  let id = input.trim()
  if (id.includes('://')) {
    let url: URL
    try {
      url = new URL(id)
    } catch {
      throw new PlaylistError(400, 'Link de playlist inválido.')
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      ![
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtu.be',
      ].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new PlaylistError(400, 'Use um link de playlist do YouTube.')
    id = url.searchParams.get('list') || ''
  }
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(id))
    throw new PlaylistError(400, 'Cole um link do YouTube com list= ou o ID da playlist.')
  return id
}
export function validRedirect(value: string) {
  try {
    const url = new URL(value)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/api/youtube/callback' &&
      (local
        ? ['http:', 'https:'].includes(url.protocol)
        : url.protocol === 'https:' && !isIP(url.hostname) && url.hostname.includes('.'))
    )
  } catch {
    return false
  }
}
type Config = { key: string; clientId: string; clientSecret: string; redirect: string }
type Account = {
  access: string
  refresh: string
  accessExpires: number
  expires: number
  refreshing?: Promise<string>
}
type Pending = { binding: string; verifier: string; expires: number; previous?: string }
type Ticket = { preview: PlaylistPreview; owner: string; account?: string; expires: number }
type GooglePlaylist = {
  id: string
  snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } }
  contentDetails: { itemCount: number }
}
type GoogleList<T> = { items?: T[]; nextPageToken?: string }
type Video = {
  id: string
  snippet: {
    title: string
    channelTitle: string
    liveBroadcastContent?: string
    thumbnails?: { medium?: { url: string } }
  }
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string }
  contentDetails?: { duration?: string }
}
type Tokens = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }
const metadata = (p: GooglePlaylist): YoutubePlaylist => ({
  id: p.id,
  title: p.snippet.title,
  channel: p.snippet.channelTitle,
  count: p.contentDetails.itemCount,
  thumbnail: p.snippet.thumbnails?.medium?.url || '',
})
function duration(value: string) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  return m
    ? Number(m[1] || 0) * 86400 +
        Number(m[2] || 0) * 3600 +
        Number(m[3] || 0) * 60 +
        Number(m[4] || 0)
    : 0
}
export class YoutubePlaylists {
  private pending = new Map<string, Pending>()
  private accounts = new Map<string, Account>()
  private tickets = new Map<string, Ticket>()
  private active = 0
  constructor(
    public config: Config,
    private http: typeof fetch = fetch,
    private now = Date.now,
  ) {}
  get configured() {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      validRedirect(this.config.redirect)
    )
  }
  private prune() {
    const now = this.now()
    for (const [id, p] of this.pending) if (p.expires <= now) this.pending.delete(id)
    for (const [id, a] of this.accounts) if (a.expires <= now) this.disconnect(id)
    for (const [id, t] of this.tickets) if (t.expires <= now) this.tickets.delete(id)
  }
  connected(id?: string) {
    this.prune()
    return !!id && this.accounts.has(id)
  }
  disconnect(id?: string) {
    if (!id) return
    this.accounts.delete(id)
    for (const [key, ticket] of this.tickets) if (ticket.account === id) this.tickets.delete(key)
  }
  begin(previous?: string) {
    this.prune()
    if (!this.configured)
      throw new PlaylistError(503, 'Configure as credenciais OAuth do YouTube no servidor.')
    if (this.pending.size >= 100 || this.accounts.size >= 100)
      throw new PlaylistError(429, 'Muitas conexões. Tente novamente mais tarde.')
    const state = secret(),
      binding = secret(),
      verifier = secret()
    this.pending.set(state, { binding, verifier, expires: this.now() + 600000, previous })
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirect,
      response_type: 'code',
      scope: YOUTUBE_READONLY,
      access_type: 'offline',
      prompt: 'consent select_account',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString()
    return { url: url.toString(), binding }
  }
  async complete(state: string, binding: string, code: string, denied = false) {
    this.prune()
    const pending = this.pending.get(state)
    if (!pending || !binding || binding !== pending.binding)
      throw new PlaylistError(400, 'Autorização inválida ou expirada. Conecte novamente.')
    this.pending.delete(state)
    if (denied || !code) throw new PlaylistError(400, 'A conexão com o Google foi cancelada.')
    const data = await this.token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirect,
      code_verifier: pending.verifier,
    })
    if (!data.scope?.split(' ').includes(YOUTUBE_READONLY))
      throw new PlaylistError(403, 'Autorize a leitura do YouTube para acessar suas playlists.')
    const id = secret()
    this.disconnect(pending.previous)
    this.accounts.set(id, {
      access: data.access_token!,
      refresh: data.refresh_token || '',
      accessExpires: this.now() + Number(data.expires_in || 3600) * 1000,
      expires: this.now() + ACCOUNT_SECONDS * 1000,
    })
    return id
  }
  private async token(params: Record<string, string>): Promise<Tokens> {
    try {
      const response = await this.http('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({
          ...params,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      })
      if (!response.ok)
        throw new PlaylistError(
          502,
          'Não foi possível autorizar o Google. Confira a configuração e conecte novamente.',
        )
      const data = (await response.json()) as Tokens
      if (!data.access_token)
        throw new PlaylistError(502, 'Google não retornou uma autorização válida.')
      return data
    } catch (error) {
      if (error instanceof PlaylistError) throw error
      throw new PlaylistError(502, 'O Google não respondeu. Tente conectar novamente.')
    }
  }
  private async access(id: string) {
    this.prune()
    const account = this.accounts.get(id)
    if (!account) throw new PlaylistError(409, 'Conecte sua conta do YouTube novamente.')
    if (account.accessExpires > this.now() + 60000) return account.access
    if (!account.refresh) {
      this.disconnect(id)
      throw new PlaylistError(409, 'Conecte sua conta do YouTube novamente.')
    }
    account.refreshing ||= this.token({
      grant_type: 'refresh_token',
      refresh_token: account.refresh,
    })
      .then((data) => {
        if (!this.accounts.has(id)) throw new PlaylistError(409, 'A conta foi desconectada.')
        account.access = data.access_token!
        account.accessExpires = this.now() + Number(data.expires_in || 3600) * 1000
        if (data.refresh_token) account.refresh = data.refresh_token
        return account.access
      })
      .catch(() => {
        this.disconnect(id)
        throw new PlaylistError(409, 'A autorização expirou. Conecte sua conta novamente.')
      })
      .finally(() => {
        account.refreshing = undefined
      })
    return account.refreshing
  }
  private async request<T>(
    path: string,
    params: Record<string, string>,
    account?: string,
  ): Promise<T> {
    const token = account ? await this.access(account) : ''
    if (!account && !this.config.key)
      throw new PlaylistError(503, 'Configure YOUTUBE_API_KEY para importar playlists por link.')
    const url = new URL('https://www.googleapis.com/youtube/v3/' + path)
    url.search = new URLSearchParams({
      ...params,
      ...(!account ? { key: this.config.key } : {}),
    }).toString()
    try {
      const response = await this.http(url, {
        signal: AbortSignal.timeout(10000),
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: { errors?: { reason: string }[] }
        }
        const reasons = data.error?.errors?.map((e) => e.reason) || []
        if (response.status === 401 && account) {
          this.disconnect(account)
          throw new PlaylistError(409, 'A autorização expirou. Conecte sua conta novamente.')
        }
        if (reasons.some((r) => ['quotaExceeded', 'dailyLimitExceeded'].includes(r)))
          throw new PlaylistError(429, 'A quota do YouTube foi atingida. Tente mais tarde.')
        if (
          response.status === 404 ||
          reasons.some((r) =>
            [
              'playlistNotFound',
              'playlistItemsNotAccessible',
              'playlistOperationUnsupported',
            ].includes(r),
          )
        )
          throw new PlaylistError(
            404,
            'Playlist indisponível para a API. Confira o link e a privacidade; mixes, Assistir mais tarde e listas especiais podem não funcionar.',
          )
        throw new PlaylistError(
          502,
          'Não foi possível ler a playlist. Confira o acesso à lista, as credenciais e a YouTube Data API v3.',
        )
      }
      const data = (await response.json()) as T
      if (account && !this.connected(account))
        throw new PlaylistError(409, 'A conta foi desconectada.')
      return data
    } catch (error) {
      if (error instanceof PlaylistError) throw error
      throw new PlaylistError(502, 'O YouTube não respondeu. Tente novamente.')
    }
  }
  async list(account: string, pageToken = '') {
    const data = await this.request<GoogleList<GooglePlaylist>>(
      'playlists',
      {
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      },
      account,
    )
    return { items: (data.items || []).map(metadata), nextPageToken: data.nextPageToken || '' }
  }
  async preview(owner: string, input: string, account?: string, pageToken = '', karaoke = false) {
    this.prune()
    if (this.active >= 3) throw new PlaylistError(429, 'Aguarde a leitura da outra playlist.')
    this.active++
    try {
      const id = playlistId(input)
      const data = await this.request<GoogleList<GooglePlaylist>>(
        'playlists',
        {
          part: 'snippet,contentDetails',
          id,
        },
        account,
      )
      const playlist = data.items?.[0]
      if (!playlist)
        throw new PlaylistError(404, 'Playlist não encontrada ou sem permissão de leitura.')
      const ids: string[] = []
      let inspected = 0,
        next = pageToken
      // Lotes de até 200 itens; o próximo cursor permite continuar listas grandes.
      for (let page = 0; page < 4; page++) {
        const items = await this.request<GoogleList<{ contentDetails?: { videoId?: string } }>>(
          'playlistItems',
          {
            part: 'contentDetails',
            playlistId: id,
            maxResults: '50',
            ...(next ? { pageToken: next } : {}),
          },
          account,
        )
        for (const item of items.items || []) {
          inspected++
          const videoId = item.contentDetails?.videoId
          if (videoId && /^[\w-]{11}$/.test(videoId)) ids.push(videoId)
        }
        next = items.nextPageToken || ''
        if (!next) break
      }
      const unique = [...new Set(ids)],
        videos = new Map<string, Video>()
      for (let offset = 0; offset < unique.length; offset += 50) {
        const data = await this.request<GoogleList<Video>>(
          'videos',
          {
            part: 'snippet,status,contentDetails',
            id: unique.slice(offset, offset + 50).join(','),
          },
          account,
        )
        for (const video of data.items || []) videos.set(video.id, video)
      }
      const tracks: Track[] = unique.flatMap((id) => {
        const v = videos.get(id)
        if (
          !v?.status?.embeddable ||
          !['public', 'unlisted'].includes(v.status.privacyStatus || '') ||
          v.status.uploadStatus !== 'processed' ||
          v.snippet.liveBroadcastContent === 'upcoming'
        )
          return []
        return [
          {
            id,
            source: 'youtube',
            title: v.snippet.title,
            artist: v.snippet.channelTitle,
            duration: duration(v.contentDetails?.duration || ''),
            thumbnail: v.snippet.thumbnails?.medium?.url || '',
            karaoke,
          },
        ]
      })
      const result: PlaylistPreview = {
        ticket: secret(),
        playlist: metadata(playlist),
        tracks,
        inspected,
        skipped: inspected - tracks.length,
        nextPageToken: next,
      }
      this.tickets.set(result.ticket, {
        preview: result,
        owner,
        account,
        expires: this.now() + 300000,
      })
      while (this.tickets.size > 100) this.tickets.delete(this.tickets.keys().next().value!)
      return result
    } finally {
      this.active--
    }
  }
  consume(ticket: string, owner: string, account?: string) {
    this.prune()
    const cached = this.tickets.get(ticket)
    if (
      !cached ||
      cached.owner !== owner ||
      (cached.account && (cached.account !== account || !this.connected(account)))
    )
      throw new PlaylistError(
        410,
        'A prévia expirou ou já foi adicionada. Confira a playlist novamente.',
      )
    this.tickets.delete(ticket)
    return cached.preview
  }
}
export function enqueuePlaylist(state: PartyState, tracks: Track[], now = Date.now()) {
  const existing = new Set(
    [...state.queue, ...(state.current ? [state.current] : [])]
      .filter((t) => t.source === 'youtube')
      .map((t) => t.id),
  )
  let added = 0
  // Monotônico: mantém a ordem de todos os lotes, mesmo em importações simultâneas.
  const base = Math.max(now, ...state.queue.map((t) => t.enqueuedAt + 1))
  for (const track of tracks) {
    if (existing.has(track.id)) continue
    state.queue.push({
      ...track,
      queueId: randomUUID(),
      guestId: 'youtube-playlists',
      guestName: 'Playlist do anfitrião',
      origin: 'human',
      enqueuedAt: base + added,
      round: 0,
      manualOrder: null,
    })
    existing.add(track.id)
    added++
  }
  return { added, duplicates: tracks.length - added }
}
