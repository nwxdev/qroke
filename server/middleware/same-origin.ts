import { getHeader, getRequestURL, createError, setHeader } from 'h3'
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
    const origin = getHeader(event, 'origin')
    if (origin && origin !== getRequestURL(event).origin)
      throw createError({ statusCode: 403, statusMessage: 'Origem não permitida.' })
    if (!getHeader(event, 'content-type')?.startsWith('application/json'))
      throw createError({ statusCode: 415, statusMessage: 'Envie JSON.' })
    if (Number(getHeader(event, 'content-length') || 0) > 32768)
      throw createError({ statusCode: 413, statusMessage: 'Pedido muito grande.' })
  }
})
