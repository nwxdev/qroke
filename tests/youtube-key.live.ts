import { expect, it } from 'vitest'
import { Catalog, type CatalogProvider } from '../server/core/catalog'

it('YouTube real: aceita a chave do ambiente para uma chamada do servidor', async () => {
  const key = process.env.NUXT_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY
  if (!key)
    throw new Error('Configure YOUTUBE_API_KEY ou NUXT_YOUTUBE_API_KEY antes deste teste opt-in.')
  const unused = async () => {
    throw new Error('Esta verificação não usa o catálogo primário.')
  }
  const provider: CatalogProvider = {
    searchSongs: unused,
    searchVideos: unused,
    getUpNexts: unused,
  }
  const catalog = new Catalog(
    provider,
    key,
    () => false,
    () => {},
  )
  // Uma videos.list, sem search.list, fila, cache ou dados de festas.
  const data = (await catalog.official('videos', {
    part: 'status',
    chart: 'mostPopular',
    regionCode: 'BR',
    maxResults: '1',
  })) as { items: unknown[] }
  expect(Array.isArray(data.items)).toBe(true)
  expect(data.items.length).toBeGreaterThan(0)
  console.log('YouTube: chave aceita pelo Google a partir deste ambiente; nenhum segredo exibido.')
})
