// A navigated same-origin document supplies the HTTP referrer YouTube requires.
// Document PiP itself is about:blank and cannot be navigated.
export default defineEventHandler((event) => {
  setHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "frame-ancestors 'self'",
  })
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"><title>QRokê · Vídeo</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101214}iframe{display:block;width:100%;height:100%;border:0}</style></head><body></body></html>`
})
