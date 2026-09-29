// Provedor falso carregado só pelos processos de teste via --import. Não integra o servidor de produção.
const original = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input))
  if (!['www.googleapis.com', 'oauth2.googleapis.com'].includes(url.hostname))
    return original(input, init)
  if (url.pathname === '/token')
    return Response.json({
      access_token: 'fixture-private-access',
      refresh_token: 'fixture-private-refresh',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
    })
  if (url.searchParams.get('pageToken') === 'slow') await new Promise((r) => setTimeout(r, 400))
  if (url.pathname.endsWith('/playlists'))
    return Response.json({
      items: [
        {
          id: 'PLabcdefghijk',
          snippet: { title: 'Playlist da festa', channelTitle: 'Canal de teste' },
          contentDetails: { itemCount: 3 },
        },
      ],
    })
  if (url.pathname.endsWith('/playlistItems'))
    return Response.json({
      items: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'].map((videoId) => ({
        contentDetails: { videoId },
      })),
    })
  if (url.pathname.endsWith('/videos'))
    return Response.json({
      items: ['bbbbbbbbbbb', 'aaaaaaaaaaa', 'ccccccccccc'].map((id, index) => ({
        id,
        snippet: {
          title: 'Música ' + (id === 'aaaaaaaaaaa' ? '1' : id === 'bbbbbbbbbbb' ? '2' : '3'),
          channelTitle: 'Artista',
        },
        status: { embeddable: index !== 2, privacyStatus: 'public', uploadStatus: 'processed' },
        contentDetails: { duration: 'PT3M' },
      })),
    })
  return Response.json({ error: {} }, { status: 404 })
}
