export default defineEventHandler(async (event) => {
  requireOwner(event)
  await requireAdmin(event)
  return { party: await party(event).close() }
})
