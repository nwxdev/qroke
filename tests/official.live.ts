import { expect, it } from 'vitest'
import { Catalog, musicProvider, type CatalogProvider } from '../server/core/catalog'
it('YouTube real: valida primário e força uma busca oficial de reserva', async () => {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('Configure YOUTUBE_API_KEY no .env antes deste teste opt-in.')
  const primary = new Catalog(
    musicProvider(),
    key,
    () => false,
    () => {},
  )
  const tracks = await primary.search('sertanejo')
  expect(tracks.length).toBeGreaterThan(0)
  expect(tracks.every((t) => t.duration > 0)).toBe(true)
  let searches = 0,
    warning: string | null = null
  const fail = async () => {
    throw new Error('Falha primária simulada para verificar a reserva real.')
  }
  const unavailable: CatalogProvider = { searchSongs: fail, searchVideos: fail, getUpNexts: fail }
  const backup = new Catalog(
    unavailable,
    key,
    () => ++searches <= 1,
    (message) => {
      warning = message
    },
  )
  const fallback = await backup.search('sertanejo')
  expect(fallback.length).toBeGreaterThan(0)
  expect(searches).toBe(1)
  expect(warning).toContain('emergência')
  await backup.search('sertanejo')
  expect(searches).toBe(1)
  console.log(
    'Validação oficial:',
    tracks.length,
    'faixas. Reserva oficial:',
    fallback.length,
    'faixas. Uma search.list consumida; cache confirmado.',
  )
})
