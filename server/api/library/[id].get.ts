import { createReadStream } from 'node:fs'
import { extname } from 'node:path'
import { byteRange } from '../../core/library'
export default defineEventHandler(async (event) => {
  let file
  try {
    file = await (await library()).file(getRouterParam(event, 'id') || '')
  } catch {}
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Arquivo não encontrado.' })
  setHeader(event, 'Accept-Ranges', 'bytes')
  const mime: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
  }
  setHeader(
    event,
    'Content-Type',
    mime[extname(file.path).toLowerCase()] || 'application/octet-stream',
  )
  let range
  try {
    range = byteRange(getHeader(event, 'range'), file.size)
  } catch {
    setHeader(event, 'Content-Range', 'bytes */' + file.size)
    throw createError({ statusCode: 416, statusMessage: 'Intervalo inválido.' })
  }
  if (range) {
    setResponseStatus(event, 206)
    setHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${file.size}`)
    setHeader(event, 'Content-Length', range.end - range.start + 1)
    return sendStream(event, createReadStream(file.path, range))
  }
  setHeader(event, 'Content-Length', file.size)
  return sendStream(event, createReadStream(file.path))
})
