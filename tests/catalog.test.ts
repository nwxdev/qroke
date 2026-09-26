import { describe, expect, it, vi } from 'vitest'
import { Catalog, isoDuration, type CatalogProvider } from '../server/core/catalog'
const raw = {
  videoId: 'abcdefghijk',
  name: 'Evidências',
  artist: { name: 'Artista' },
  duration: 180,
  thumbnails: [],
}
function provider(): CatalogProvider {
  return {
    searchSongs: vi.fn().mockResolvedValue([raw]),
    searchVideos: vi.fn().mockResolvedValue([raw]),
    getUpNexts: vi.fn().mockResolvedValue([raw]),
  }
}
describe('catálogo', () => {
  it('sinaliza chave inválida sem refletir metadados privados do provedor', async () => {
    const warn = vi.fn()
    const http = vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            details: [{ reason: 'API_KEY_INVALID', metadata: { api_key: 'private-marker' } }],
          },
        },
        { status: 400 },
      ),
    )
    const c = new Catalog(provider(), 'key', () => true, warn, http)
    await expect(c.search('teste')).rejects.toThrow('YOUTUBE_API_KEY inválida')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Validação oficial indisponível'))
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-marker')
  })

  it('compartilha consultas simultâneas, normaliza e usa cache', async () => {
    const p = provider(),
      warning = vi.fn(),
      catalog = new Catalog(p, '', () => true, warning)
    const [a, b] = await Promise.all([
      catalog.search(' Evidências  '),
      catalog.search('evidências'),
    ])
    expect(a).toEqual(b)
    expect(p.searchSongs).toHaveBeenCalledTimes(1)
    await catalog.search('Evidências')
    expect(p.searchSongs).toHaveBeenCalledTimes(1)
    expect(catalog.selected(raw.videoId, false)?.title).toBe(raw.name)
    expect(catalog.selected(raw.videoId, true)).toBeUndefined()
  })
  it('usa vídeos nas duas grafias e deduplica', async () => {
    const p = provider(),
      catalog = new Catalog(
        p,
        '',
        () => true,
        () => {},
      )
    expect(await catalog.search('Evidências', true)).toHaveLength(1)
    expect(p.searchVideos).toHaveBeenCalledWith('karaoke evidências')
    expect(p.searchVideos).toHaveBeenCalledWith('karaokê evidências')
  })
  it('cai no oficial, valida embeddable e sinaliza inclusive no cache', async () => {
    const p = provider()
    vi.mocked(p.searchSongs).mockRejectedValue(new Error('offline'))
    const warn = vi.fn(),
      reserve = vi.fn(() => true)
    const http = vi.fn(async (url: URL | RequestInfo) => {
      if (String(url).includes('/search?'))
        return Response.json({
          items: [
            {
              id: { videoId: raw.videoId },
              snippet: { title: 'Raw', channelTitle: 'Canal', thumbnails: {} },
            },
          ],
        })
      return Response.json({
        items: [
          {
            id: raw.videoId,
            status: { embeddable: true, privacyStatus: 'public' },
            snippet: { title: 'Validado', channelTitle: 'Canal' },
            contentDetails: { duration: 'PT3M5S' },
          },
        ],
      })
    }) as unknown as typeof fetch
    const c = new Catalog(p, 'private-key', reserve, warn, http)
    expect((await c.search('teste'))[0]?.duration).toBe(185)
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('emergência'))
    await c.search('teste')
    expect(reserve).toHaveBeenCalledTimes(1)
  })
  it('não chama reserva sem chave nem ultrapassa quota', async () => {
    const p = provider()
    vi.mocked(p.searchSongs).mockRejectedValue(new Error('offline'))
    const http = vi.fn(),
      reserve = vi.fn(() => false)
    await expect(new Catalog(p, '', reserve, () => {}, http).search('teste')).rejects.toThrow(
      'YOUTUBE_API_KEY',
    )
    expect(reserve).not.toHaveBeenCalled()
    await expect(new Catalog(p, 'key', reserve, () => {}, http).search('teste')).rejects.toThrow(
      'Limite diário',
    )
    expect(http).not.toHaveBeenCalled()
  })
  it('remove vídeos privados, ausentes e não incorporáveis', async () => {
    const p = provider(),
      http = vi.fn().mockResolvedValue(
        Response.json({
          items: [{ id: raw.videoId, status: { embeddable: false, privacyStatus: 'public' } }],
        }),
      )
    const c = new Catalog(
      p,
      'key',
      () => true,
      () => {},
      http,
    )
    expect(await c.search('teste')).toEqual([])
    expect(isoDuration('PT1H2M3S')).toBe(3723)
    expect(isoDuration('bad')).toBe(0)
  })
})
