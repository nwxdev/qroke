import { publicSitemap } from '#shared/sitemap'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return publicSitemap(String(useRuntimeConfig().public.partyUrl))
})
