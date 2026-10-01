import { SITE_URL, PUBLIC_PAGES, isProductionSite } from '#shared/site'
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  const entries = isProductionSite(String(useRuntimeConfig().public.partyUrl))
    ? Object.keys(PUBLIC_PAGES)
        .map((path) => '<url><loc>' + SITE_URL + path + '</loc></url>')
        .join('\n')
    : ''
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries +
    '\n</urlset>\n'
  )
})
