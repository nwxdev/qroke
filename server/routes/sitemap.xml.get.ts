import { SITE_URL, isProductionSite } from '#shared/site'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  const entry = isProductionSite(String(useRuntimeConfig().public.partyUrl))
    ? '<url><loc>' + SITE_URL + '/</loc></url>'
    : ''
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entry +
    '</urlset>\n'
  )
})
