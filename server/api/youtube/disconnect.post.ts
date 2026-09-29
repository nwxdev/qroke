export default defineEventHandler(async (event) => {
  await playlistAccess(event)
  await (await youtube(event)).disconnect(await youtubeAccount(event))
  deleteCookie(event, 'qroke_youtube', { path: '/' })
  return { connected: false }
})
