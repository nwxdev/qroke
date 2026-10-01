import { PUBLIC_PAGES, SITE_URL, isProductionSite } from './site'

function xmlText(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!,
  )
}

export function publicSitemap(partyUrl: string) {
  // This registry contains only canonical public pages, never discovered party/session URLs.
  const entries = isProductionSite(partyUrl)
    ? Object.entries(PUBLIC_PAGES).map(
        ([path, page]) =>
          '  <url>\n' +
          '    <loc>' +
          xmlText(SITE_URL + path) +
          '</loc>\n' +
          '    <lastmod>' +
          xmlText(page.lastModified) +
          '</lastmod>\n' +
          '  </url>',
      )
    : []
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- QRokê: páginas públicas canônicas. Mapa de navegação: https://qroke.com.br/mapa-do-site -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}
