export default defineEventHandler((event) => {
  playlistAccess(event)
  youtube().disconnect(youtubeAccount(event))
  deleteCookie(event, 'qroke_youtube', { path: '/' })
  return { connected: false }
})
