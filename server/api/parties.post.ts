import { randomUUID } from 'node:crypto'
export default defineEventHandler(async (event) => {
  requireOwner(event)
  await requireAdmin(event)
  const id = randomUUID()
  await (await openParty(party(event).organizationId, id)).ensure()
  return { partyId: id }
})
