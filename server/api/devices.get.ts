export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { devices: await party(event).devices() }
})
