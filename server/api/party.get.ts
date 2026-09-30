export default defineEventHandler(async (event) => ({
  party: await party(event).info(),
  serverTime: Date.now(),
}))
