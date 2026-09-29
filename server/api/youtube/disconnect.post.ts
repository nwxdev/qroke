export default defineEventHandler(async (event) => {
  await playlistAccess(event)
  await (await youtube(event)).disconnect(await youtubeAccount(event))
  await setPartyCredential(event, 'qroke_youtube', undefined)
  return { connected: false }
})
