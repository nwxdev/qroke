export default defineEventHandler((event) => ({
  guest: party().guest(getCookie(event, 'qroke_guest')) || null,
  admin: party().admin(getCookie(event, 'qroke_admin')),
  adminExpiresAt: party().adminExpiresAt(),
  adminLeaseSeconds: adminLeaseSeconds(),
}))
