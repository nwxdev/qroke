export default defineEventHandler(async (event) => {
  const guest = await party(event).guest(getCookie(event, 'qroke_guest'))
  if (guest) {
    await party(event).touchGuest(guest.id)
    await touchPresence(party(event), 'guest', guest.id)
  }
  return {
    guest: guest || null,
    queueReactions: guest ? await party(event).guestReactions(guest.id) : {},
    votedQueueIds: guest ? await party(event).guestVotes(guest.id) : [],
    admin: await party(event).admin(getCookie(event, 'qroke_admin')),
    adminExpiresAt: await party(event).adminExpiresAt(),
    adminLeaseSeconds: adminLeaseSeconds(),
  }
})
