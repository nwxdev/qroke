export default defineEventHandler(async (event) => {
  await requirePartyOwner(event)
  await requireAdmin(event)
  return { party: await party(event).close() }
})
