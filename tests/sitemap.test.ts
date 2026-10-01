import { describe, expect, it, vi } from 'vitest'
import { PUBLIC_PAGES, SITE_URL } from '../shared/site'
import { publicSitemap } from '../shared/sitemap'

describe('sitemap público', () => {
  it('publica apenas as páginas canônicas, com datas válidas de conteúdo', () => {
    expect(Object.keys(PUBLIC_PAGES)).toEqual([
      '/',
      '/como-funciona',
      '/karaoke-online',
      '/perguntas-frequentes',
      '/termos-de-uso',
      '/politica-de-privacidade',
      '/exclusao-de-dados',
      '/mapa-do-site',
    ])
    const xml = publicSitemap(SITE_URL)
    for (const [path, page] of Object.entries(PUBLIC_PAGES)) {
      expect(xml).toContain('<loc>' + SITE_URL + path + '</loc>')
      expect(page.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(page.lastModified).toISOString().slice(0, 10)).toBe(page.lastModified)
      expect(xml).toContain('<lastmod>' + page.lastModified + '</lastmod>')
    }
    for (const path of ['/entrar', '/busca', '/host', '/player', '/qr', '/tv', '/f/', '/api/'])
      expect(xml).not.toContain('<loc>' + SITE_URL + path)
  })

  it('não transforma o horário da requisição em atualização de conteúdo', () => {
    const xml = publicSitemap(SITE_URL)
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2099-12-31T12:00:00Z'))
      expect(publicSitemap(SITE_URL)).toBe(xml)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    '',
    'invalid',
    'http://localhost:3000',
    'https://preview.qroke.com.br',
    'http://qroke.com.br',
  ])('não anuncia páginas de uma instalação que não seja produção: %s', (origin) => {
    const xml = publicSitemap(origin)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).not.toContain('<loc>')
    expect(xml).not.toContain('<lastmod>')
  })
})
