import type { Device } from '../../shared/types'
export default defineEventHandler((event) => {
  requireAdmin(event)
  const rows = party()
    .db.prepare('SELECT id,label,last_seen AS lastSeen,info FROM devices ORDER BY last_seen DESC')
    .all() as (Omit<Device, 'info'> & { info: string })[]
  return { devices: rows.map((row) => ({ ...row, info: JSON.parse(row.info) as Device['info'] })) }
})
