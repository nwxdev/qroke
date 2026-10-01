import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
import { mkdir } from 'node:fs/promises'
const fixture = await startFixture(3266, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'https://qroke.com.br',
})
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  await mkdir('test-results', { recursive: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (['warning', 'error'].includes(m.type()) && /hydration|invalid vnode/i.test(m.text()))
      errors.push(m.text())
  })
  const paths = ['/', '/como-funciona', '/karaoke-online', '/perguntas-frequentes', '/mapa-do-site']
  const titles = new Set()
  const modifiedDates = new Map()
  for (const path of paths) {
    const r = await page.goto(fixture.base + path)
    expect(r.status()).toBe(200)
    const source = await r.text()
    expect(source).not.toContain('<undefined')
    const meta = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const tag = (name) =>
        doc.querySelector('meta[name="' + name + '"],meta[property="' + name + '"]')?.content
      return {
        title: doc.title,
        description: tag('description'),
        robots: tag('robots'),
        image: tag('og:image'),
        imageType: tag('og:image:type'),
        ogUrl: tag('og:url'),
        canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        h1: doc.querySelector('h1')?.textContent,
        graph: JSON.parse(
          doc.querySelector('script[type="application/ld+json"]')?.textContent || '{}',
        )['@graph'],
      }
    }, source)
    expect(meta.robots).toContain('index, follow')
    expect(meta.canonical).toBe('https://qroke.com.br' + path)
    expect(meta.ogUrl).toBe(meta.canonical)
    expect(meta.image).toBe('https://qroke.com.br/brand/qroke-share-v2.jpg')
    expect(meta.imageType).toBe('image/jpeg')
    expect(meta.h1?.length).toBeGreaterThan(15)
    expect(meta.description?.length).toBeGreaterThan(80)
    titles.add(meta.title)
    expect(meta.graph.some((x) => x['@type'] === 'WebApplication')).toBe(true)
    const pageSchema = meta.graph.find((x) => x['@id'] === meta.canonical + '#page')
    expect(pageSchema.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    modifiedDates.set(meta.canonical, pageSchema.dateModified)
    await expect(
      page.locator('footer').getByRole('link', { name: 'Mapa do site', exact: true }),
    ).toBeVisible()
    if (path === '/mapa-do-site') {
      const links = await page
        .getByRole('navigation', { name: 'Mapa das páginas públicas' })
        .getByRole('link')
        .evaluateAll((items) => items.map((item) => item.getAttribute('href')))
      expect(links.sort()).toEqual(paths.filter((item) => item !== path).sort())
      expect(pageSchema['@type']).toBe('CollectionPage')
      expect(
        pageSchema.mainEntity.itemListElement.map((item) => new URL(item.url).pathname).sort(),
      ).toEqual(links.sort())
      await expect(page.locator('time')).toHaveCount(4)
    }
    if (path === '/perguntas-frequentes') {
      const faq = meta.graph.find((x) => x['@type'] === 'FAQPage')
      expect(faq.mainEntity).toHaveLength(8)
      for (const q of faq.mainEntity) expect(source).toContain(q.acceptedAnswer.text)
    }
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
    await page.screenshot({
      path: 'test-results/seo-' + (path === '/' ? 'home' : path.slice(1)) + '.png',
      fullPage: true,
    })
  }
  expect(titles.size).toBe(paths.length)
  const sitemapResponse = await fetch(fixture.base + '/sitemap.xml')
  expect(sitemapResponse.status).toBe(200)
  expect(sitemapResponse.headers.get('content-type')).toContain('application/xml')
  const sitemap = await sitemapResponse.text()
  const parsed = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    return {
      errors: doc.querySelectorAll('parsererror').length,
      namespace: doc.documentElement.namespaceURI,
      entries: [...doc.querySelectorAll('url')].map((entry) => ({
        loc: entry.querySelector('loc')?.textContent,
        lastmod: entry.querySelector('lastmod')?.textContent,
      })),
    }
  }, sitemap)
  expect(parsed.errors).toBe(0)
  expect(parsed.namespace).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
  expect(parsed.entries.map((entry) => entry.loc).sort()).toEqual(
    paths.map((path) => 'https://qroke.com.br' + path).sort(),
  )
  for (const entry of parsed.entries) {
    expect(entry.lastmod).toBe(modifiedDates.get(entry.loc))
    expect(new Date(entry.lastmod).toISOString().slice(0, 10)).toBe(entry.lastmod)
    expect(new Date(entry.lastmod).getTime()).toBeLessThanOrEqual(Date.now())
  }
  expect(await (await fetch(fixture.base + '/sitemap.xml?convite=ignorado')).text()).toBe(sitemap)
  expect(sitemap).not.toContain('/entrar')
  const robots = await (await fetch(fixture.base + '/robots.txt')).text()
  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Disallow: /api/')
  expect(robots).toContain('Sitemap: https://qroke.com.br/sitemap.xml')
  // Share previews must be in HTML for crawlers without scripts, cookies or invitation tokens.
  for (const agent of [
    'facebookexternalhit/1.1',
    'TelegramBot',
    'WhatsApp/2',
    'OAI-SearchBot',
    'Googlebot',
  ]) {
    const response = await fetch(
      fixture.base + '/f/festa-exemplo/entrar?convite=segredo&nome=Privado',
      { headers: { 'user-agent': agent } },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    const html = await response.text()
    const head = html.split('</head>')[0]
    expect(head).toContain(
      'property="og:image" content="https://qroke.com.br/brand/qroke-share-v2.jpg"',
    )
    expect(head).toContain(
      'property="og:url" content="https://qroke.com.br/f/festa-exemplo/entrar"',
    )
    expect(head).not.toContain('segredo')
    expect(head).not.toContain('Privado')
    expect(head).toContain('name="robots" content="noindex, nofollow"')
  }
  const entry = await fetch(fixture.base + '/entrar')
  expect(entry.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  for (const path of ['/host', '/busca', '/player', '/qr', '/tv']) {
    const r = await fetch(fixture.base + path, { redirect: 'manual' })
    expect(r.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect([302, 307]).toContain(r.status)
  }
  expect((await fetch(fixture.base + '/pagina-inexistente')).status).toBe(404)
  expect((await fetch(fixture.base + '/api/state')).status).toBe(401)
  const asset = await fetch(fixture.base + '/brand/qroke-share-v2.jpg')
  expect(asset.status).toBe(200)
  expect(asset.headers.get('content-type')).toContain('image/jpeg')
  expect((await asset.arrayBuffer()).byteLength).toBeLessThan(300000)
  await page.goto(fixture.base + '/brand/qroke-share-v2.jpg')
  expect(await page.locator('img').evaluate((i) => [i.naturalWidth, i.naturalHeight])).toEqual([
    1200, 630,
  ])
  expect(errors).toEqual([])
  console.log(
    'SEO: 5 páginas SSR, mapa navegável, títulos/canonicals, FAQ, XML válido com datas estáveis, robots, 5 crawlers, convite sem segredos, imagem 1200×630, 404 e acesso privado OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
