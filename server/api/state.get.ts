export default defineEventHandler(async (event) => {
  const database = party(event)
  const [state, guests, devices] = await Promise.all([
    database.publicState(),
    presentIds(database, 'guest'),
    presentIds(database, 'device'),
  ])
  return {
    ...state,
    guests: state.guests.filter((g) => guests.has(g.id)),
    devices: state.devices.filter((d) => devices.has(d.id)),
  }
})
