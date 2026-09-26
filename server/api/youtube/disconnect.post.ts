export default defineEventHandler((event) => {
  requireAdmin(event)
  youtube().disconnect(youtubeAccount(event))
  deleteCookie(event, 'qroke_youtube', { path: '/' })
  return { connected: false }
})
