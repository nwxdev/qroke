export default defineEventHandler((event) => {
  const device = requireDevice(event)
  party().db.prepare('UPDATE devices SET last_seen=? WHERE id=?').run(Date.now(), device.id)
  return { ok: true }
})
