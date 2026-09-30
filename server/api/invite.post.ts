export default defineEventHandler(async (event) => {
  requireOwner(event)
  await requireAdmin(event)
  await ensurePartyInvite(event, true)
  return { ok: true }
})
