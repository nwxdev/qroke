export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await requireAdmin(event)
  await ensurePartyInvite(event, true)
  return { ok: true }
})
