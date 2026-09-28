import type { Device } from '../../shared/types'
export default defineEventHandler((event) => {
  requireAdmin(event)
  return {
    devices: party()
      .db.prepare('SELECT id,label,last_seen AS lastSeen FROM devices ORDER BY last_seen DESC')
      .all() as Device[],
  }
})
