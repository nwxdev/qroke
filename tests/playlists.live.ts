import { expect, it } from 'vitest'
import { YoutubePlaylists } from '../server/core/youtube-playlists'
it.skipIf(!process.env.YOUTUBE_API_KEY)('lê playlist pública real sem alterar a fila', async () => {
  const service = new YoutubePlaylists({
    key: process.env.YOUTUBE_API_KEY!,
    clientId: '',
    clientSecret: '',
    redirect: '',
  })
  // Uploads do canal Google for Developers; pode ser substituída por uma playlist pública.
  const preview = await service.preview(
    'live-test',
    process.env.YOUTUBE_TEST_PLAYLIST_ID || 'UU_x5XG1OV2P6uZZ5FSM9Ttw',
  )
  expect(preview.tracks.length).toBeGreaterThan(0)
  expect(preview.inspected).toBeLessThanOrEqual(200)
  expect(preview.tracks.every((track) => track.source === 'youtube')).toBe(true)
  console.log(
    'Playlist pública real: ' +
      preview.tracks.length +
      ' faixas válidas em ' +
      preview.inspected +
      ' itens; nenhuma faixa adicionada à festa.',
  )
})
