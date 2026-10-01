import { PUBLIC_PAGES, SITE_URL } from '../../shared/site'

export default defineEventHandler((event) => {
  const id = useRuntimeConfig().public.gaMeasurementId
  if (!/^G-[A-Z0-9]+$/.test(id)) throw createError({ statusCode: 404 })
  setHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
  })
  const config = JSON.stringify({ id, site: SITE_URL, pages: PUBLIC_PAGES }).replace(/</g, '\u003c')
  // No tag is loaded by this endpoint alone. The parent must send an allowed page
  // after consent. A fixed frame URL keeps history/form autocapture out of the app.
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>QRokê · Medição</title></head><body><script id="analytics-config" type="application/json">${config}</script><script src="/analytics-frame.js"></script></body></html>`
})
