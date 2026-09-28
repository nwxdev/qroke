export default defineEventHandler((event) => {
  const guest = party().guest(getCookie(event, 'qroke_guest'))
  if (guest) party().touchGuest(guest.id)
  return {
    guest: guest || null,
    queueReactions: guest ? party().guestReactions(guest.id) : {},
    votedQueueIds: guest ? party().guestVotes(guest.id) : [],
    admin: party().admin(getCookie(event, 'qroke_admin')),
    adminExpiresAt: party().adminExpiresAt(),
    adminLeaseSeconds: adminLeaseSeconds(),
  }
})
