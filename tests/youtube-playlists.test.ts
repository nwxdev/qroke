import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import {
  YoutubePlaylists,
  YOUTUBE_READONLY,
  playlistId,
  validRedirect,
  enqueuePlaylist,
} from '../server/core/youtube-playlists'
import { initialState } from '../server/core/database'
import { orderQueue } from '../server/core/rules'
const config = {
  key: 'test-key',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  redirect: 'http://localhost:3100/api/youtube/callback',
}
const ids = [
  'aaaaaaaaaaa',
  'bbbbbbbbbbb',
  'ccccccccccc',
  'ddddddddddd',
  'eeeeeeeeeee',
  'fffffffffff',
]
function mock() {
  const calls: { url: URL; init?: RequestInit }[] = []
  const http = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    calls.push({ url, init })
    if (url.pathname === '/token')
      return Response.json({
        access_token: 'private-access',
        refresh_token: 'private-refresh',
        expires_in: 3600,
        scope: YOUTUBE_READONLY,
      })
    if (url.pathname.endsWith('/playlists'))
      return Response.json({
        items: [
          {
            id: 'PLabcdefghijk',
            snippet: { title: 'Minha playlist', channelTitle: 'Canal' },
            contentDetails: { itemCount: 7 },
          },
        ],
        ...(url.searchParams.get('mine') ? { nextPageToken: 'another-page' } : {}),
      })
    if (url.pathname.endsWith('/playlistItems'))
      return Response.json({
        items: (url.searchParams.get('pageToken') ? [ids[5]] : [...ids.slice(0, 5), ids[0]]).map(
          (id) => ({ contentDetails: { videoId: id } }),
        ),
        ...(!url.searchParams.get('pageToken') ? { nextPageToken: 'page2' } : {}),
      })
    if (url.pathname.endsWith('/videos'))
      return Response.json({
        items: ids
          .slice()
          .reverse()
          .filter((id) => id !== ids[3])
          .map((id) => ({
            id,
            status: {
              embeddable: id !== ids[2],
              privacyStatus: id === ids[1] ? 'private' : id === ids[5] ? 'unlisted' : 'public',
              uploadStatus: 'processed',
            },
            snippet: {
              title: 'Vídeo ' + id,
              channelTitle: 'Canal',
              liveBroadcastContent: id === ids[4] ? 'upcoming' : 'none',
            },
            contentDetails: { duration: 'PT3M12S' },
          })),
      })
    throw new Error('unexpected URL')
  }) as unknown as typeof fetch
  return { http, calls }
}
async function login(service: YoutubePlaylists) {
  const flow = await service.begin()
  return service.complete(new URL(flow.url).searchParams.get('state')!, flow.binding, 'code')
}
describe('playlists e conexão YouTube', () => {
  it('aceita links YouTube/Music e IDs, recusando URLs externas e IDs inválidos', () => {
    for (const host of ['www.youtube.com', 'music.youtube.com', 'youtu.be'])
      expect(playlistId('https://' + host + '/watch?v=abc&list=PLabcdefghijk')).toBe(
        'PLabcdefghijk',
      )
    expect(playlistId(' PLabcdefghijk ')).toBe('PLabcdefghijk')
    for (const input of [
      'https://evil.test/?list=PLabcdefghijk',
      'https://youtube.com.evil.test/?list=PLabcdefghijk',
      'https://x@youtube.com/?list=PLabcdefghijk',
      'file:///etc/passwd',
      'https://youtube.com/watch?v=aaaaaaaaaaa',
      '../etc/passwd',
    ])
      expect(() => playlistId(input)).toThrow()
    expect(validRedirect(config.redirect)).toBe(true)
    expect(validRedirect('https://party.example.com/api/youtube/callback')).toBe(true)
    for (const url of [
      'http://192.168.1.5/api/youtube/callback',
      'https://192.168.1.5/api/youtube/callback',
      'http://party.example.com/api/youtube/callback',
      config.redirect + '?to=evil',
    ])
      expect(validRedirect(url)).toBe(false)
  })
  it('vincula state ao navegador, usa PKCE e consome a autorização uma única vez', async () => {
    const { http, calls } = mock(),
      service = new YoutubePlaylists(config, http)
    const flow = await service.begin(),
      url = new URL(flow.url),
      state = url.searchParams.get('state')!
    expect(url.searchParams.get('scope')).toBe(YOUTUBE_READONLY)
    expect(url.searchParams.get('client_secret')).toBeNull()
    await expect(service.complete(state, 'another-browser', 'code')).rejects.toThrow('inválida')
    expect(calls).toHaveLength(0)
    const account = await service.complete(state, flow.binding, 'code')
    const body = calls[0]!.init!.body as URLSearchParams
    expect(createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(
      url.searchParams.get('code_challenge'),
    )
    expect(await service.connected(account)).toBe(true)
    await expect(service.complete(state, flow.binding, 'code')).rejects.toThrow('inválida')
    expect(calls).toHaveLength(1)
  })
  it('recusa state vencido, consentimento negado e permissão insuficiente', async () => {
    const { http, calls } = mock()
    let now = 0
    const service = new YoutubePlaylists(config, http, () => now)
    const flow = await service.begin()
    now = 600001
    await expect(
      service.complete(new URL(flow.url).searchParams.get('state')!, flow.binding, 'code'),
    ).rejects.toThrow('expirada')
    const next = await service.begin()
    await expect(
      service.complete(new URL(next.url).searchParams.get('state')!, next.binding, '', true),
    ).rejects.toThrow('cancelada')
    expect(calls).toHaveLength(0)
    const restricted = new YoutubePlaylists(config, (async () =>
      Response.json({ access_token: 'a', scope: 'email' })) as typeof fetch)
    await expect(login(restricted)).rejects.toThrow('leitura')
  })
  it('lista a conta com bearer privado, paginação e renovação única concorrente', async () => {
    const { http, calls } = mock()
    let now = 0
    const service = new YoutubePlaylists(config, http, () => now),
      account = await login(service)
    now = 3600000
    const results = await Promise.all([service.list(account, 'second'), service.list(account)])
    expect(results[0]!.nextPageToken).toBe('another-page')
    expect(calls.filter((c) => c.url.pathname === '/token')).toHaveLength(2)
    const request = calls.find((c) => c.url.searchParams.get('pageToken') === 'second')!
    expect(request.url.searchParams.get('mine')).toBe('true')
    expect(request.url.searchParams.has('key')).toBe(false)
    expect(request.init!.headers).toEqual({ Authorization: 'Bearer private-access' })
    expect(JSON.stringify(results)).not.toContain('private-access')
    now = 8 * 3600000
    expect(await service.connected(account)).toBe(false)
  })
  it('recupera acesso revogado sem expor respostas com credenciais', async () => {
    const { http } = mock()
    let now = 0,
      fail = false
    const wrapper = (async (...args: Parameters<typeof fetch>) =>
      fail
        ? new Response('private-secret-provider-error', { status: 400 })
        : http(...args)) as typeof fetch
    const service = new YoutubePlaylists(config, wrapper, () => now),
      account = await login(service)
    now = 3600000
    fail = true
    await expect(service.list(account)).rejects.toThrow('Conecte sua conta novamente')
    expect(await service.connected(account)).toBe(false)
  })
  it('lê todas as páginas do lote, preserva ordem e filtra privados, removidos, estreia e duplicatas', async () => {
    const { http, calls } = mock(),
      service = new YoutubePlaylists(config, http)
    const preview = await service.preview(
      'admin',
      'https://youtube.com/playlist?list=PLabcdefghijk',
      undefined,
      '',
      true,
    )
    expect(preview.tracks.map((t) => t.id)).toEqual([ids[0], ids[5]])
    expect(preview.tracks.every((t) => t.karaoke && t.duration === 192)).toBe(true)
    expect(preview.inspected).toBe(7)
    expect(preview.skipped).toBe(5)
    expect(preview.nextPageToken).toBe('')
    expect(calls.filter((c) => c.url.pathname.endsWith('/playlistItems'))).toHaveLength(2)
    await expect(service.consume(preview.ticket, 'other-admin')).rejects.toThrow('expirou')
    expect((await service.consume(preview.ticket, 'admin')).tracks).toHaveLength(2)
    await expect(service.consume(preview.ticket, 'admin')).rejects.toThrow('já foi adicionada')
  })
  it('oferece cursor para o próximo lote e limita requisições/IDs por lote', async () => {
    const { http, calls } = mock()
    const wrapper = (async (...args: Parameters<typeof fetch>) => {
      const url = new URL(String(args[0]))
      if (url.pathname.endsWith('/playlistItems'))
        return Response.json({
          items: Array.from({ length: 50 }, (_, n) => ({
            contentDetails: { videoId: String(calls.length * 50 + n).padStart(11, '0') },
          })),
          nextPageToken: 'more',
        })
      return http(...args)
    }) as typeof fetch
    const service = new YoutubePlaylists(config, wrapper)
    const spy = vi.spyOn(service as unknown as { http: typeof fetch }, 'http')
    const preview = await service.preview('admin', 'PLabcdefghijk')
    expect(preview.inspected).toBe(200)
    expect(preview.nextPageToken).toBe('more')
    expect(spy.mock.calls.filter((c) => String(c[0]).includes('/playlistItems?'))).toHaveLength(4)
    for (const c of calls.filter((c) => c.url.pathname.endsWith('/videos')))
      expect(c.url.searchParams.get('id')!.split(',').length).toBeLessThanOrEqual(50)
  })
  it('prévia privada fica vinculada à conta/navegador e desaparece ao desconectar', async () => {
    const { http } = mock(),
      service = new YoutubePlaylists(config, http)
    const account = await login(service)
    const preview = await service.preview('admin', 'PLabcdefghijk', account)
    await expect(service.consume(preview.ticket, 'admin', 'other-browser')).rejects.toThrow(
      'expirou',
    )
    await service.disconnect(account)
    await expect(service.consume(preview.ticket, 'admin', account)).rejects.toThrow('expirou')
  })
  it('uma prévia expira; erros do provedor não revelam a key', async () => {
    const { http } = mock()
    let now = 0
    const service = new YoutubePlaylists(config, http, () => now)
    const preview = await service.preview('admin', 'PLabcdefghijk')
    now = 300001
    await expect(service.consume(preview.ticket, 'admin')).rejects.toThrow('expirou')
    const bad = new YoutubePlaylists(config, (async () => {
      throw new Error('private-key in URL')
    }) as typeof fetch)
    await expect(bad.preview('admin', 'PLabcdefghijk')).rejects.toThrow('O YouTube não respondeu')
  })
  it('adiciona lotes sem duplicar fila/current, mantém ordem e rodízio dos convidados', async () => {
    const { http } = mock(),
      service = new YoutubePlaylists(config, http),
      s = initialState()
    const preview = await service.preview('admin', 'PLabcdefghijk')
    expect(enqueuePlaylist(s, preview.tracks, 100)).toEqual({ added: 2, duplicates: 0 })
    s.current = s.queue.shift()!
    expect(enqueuePlaylist(s, preview.tracks, 100)).toEqual({ added: 0, duplicates: 2 })
    const other = {
      ...s.queue[0]!,
      id: 'ggggggggggg',
      guestId: 'guest',
      guestName: 'Convidado',
      queueId: 'guest',
      enqueuedAt: 102,
    }
    s.queue.push(other)
    expect(orderQueue(s.queue, [s.current]).map((t) => t.guestId)).toEqual([
      'guest',
      'youtube-playlists',
    ])
    expect(s.current.id).toBe(ids[0])
  })
})

it('vincula a autorização ao ator e não desconecta a conta de outro na reconexão', async () => {
  const { http } = mock(),
    service = new YoutubePlaylists(config, http)
  const a = await service.begin(undefined, 'guest:ana')
  const accountA = await service.complete(
    new URL(a.url).searchParams.get('state')!,
    a.binding,
    'code',
  )
  expect(await service.ownedAccount(accountA, 'guest:ana')).toBe(accountA)
  expect(await service.ownedAccount(accountA, 'guest:bia')).toBeUndefined()
  const b = await service.begin(accountA, 'guest:bia')
  const accountB = await service.complete(
    new URL(b.url).searchParams.get('state')!,
    b.binding,
    'code',
  )
  expect(await service.connected(accountA)).toBe(true)
  expect(await service.ownedAccount(accountB, 'guest:bia')).toBe(accountB)
  const preview = await service.preview('guest:ana', 'PLabcdefghijk', accountA)
  await expect(service.consume(preview.ticket, 'guest:bia', accountA)).rejects.toThrow()
  const party = initialState()
  enqueuePlaylist(party, preview.tracks, 100, {
    guest: { id: 'ana', name: 'Ana' },
    playlist: preview.playlist,
  })
  expect(party.queue[0]?.guestId).toBe('ana')
  expect(party.queue[0]?.playlist).toEqual({ id: 'PLabcdefghijk', title: 'Minha playlist' })
})

it('filtra região e recusas na prévia e verifica novamente ao importar', async () => {
  const { http } = mock(),
    blocked = new Set<string>()
  const wrapper = (async (...args: Parameters<typeof fetch>) => {
    const response = await http(...args)
    if (!String(args[0]).includes('/videos?')) return response
    const data = await response.json()
    data.items.find((item: { id: string }) => item.id === ids[5]).contentDetails.regionRestriction =
      { blocked: ['BR'] }
    return Response.json(data)
  }) as typeof fetch
  const service = new YoutubePlaylists(config, wrapper, undefined, (id) => blocked.has(id))
  const preview = await service.preview('guest', 'PLabcdefghijk')
  expect(preview.tracks.map((track) => track.id)).toEqual([ids[0]])
  blocked.add(ids[0]!)
  expect((await service.consume(preview.ticket, 'guest')).tracks).toEqual([])
  expect((await service.preview('guest', 'PLabcdefghijk')).tracks).toEqual([])
})
