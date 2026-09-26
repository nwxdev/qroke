import YTMusic from 'ytmusic-api'
const api = new YTMusic()
await api.initialize({ GL: 'BR', HL: 'pt' })
const songs = await api.searchSongs('sertanejo')
console.log('Busca:', songs.length, 'resultados')
if (songs[0]) {
  console.log('Primeiro:', songs[0].videoId, songs[0].name)
  const next = await api.getUpNexts(songs[0].videoId)
  console.log('Rádio getUpNexts:', next.length, 'resultados')
}
const videos = await api.searchVideos('karaoke evidências')
console.log('Karaokê:', videos.length, 'resultados')
