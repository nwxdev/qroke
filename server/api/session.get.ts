export default defineEventHandler(async (event) => {
  const guest = await party(event).guest(partyCredential(event, 'qroke_guest'))
  if (guest) {
    await party(event).touchGuest(guest.id)
    await touchPresence(party(event), 'guest', guest.id)
  }
  const role = await partyRole(event)
  const managed = !!(await party(event).details()).createdBy
  return {
    role,
    managed,
    guest: guest || null,
    queueReactions: guest ? await party(event).guestReactions(guest.id) : {},
    votedQueueIds: guest ? await party(event).guestVotes(guest.id) : [],
    admin: managed
      ? role !== 'guest'
      : await party(event).admin(partyCredential(event, 'qroke_admin')),
    adminExpiresAt: await party(event).adminExpiresAt(),
    adminLeaseSeconds: adminLeaseSeconds(),
  }
})
