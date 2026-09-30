import { SITE_URL, isProductionSite } from '#shared/site'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  if (!isProductionSite(String(useRuntimeConfig().public.partyUrl)))
    return 'User-agent: *\nDisallow: /\n'
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /ws',
    '',
    'Sitemap: ' + SITE_URL + '/sitemap.xml',
    '',
  ].join('\n')
})
