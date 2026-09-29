import type { H3Event } from 'h3'
import type { Guest } from '../../shared/types'
export async function karaokeParticipants(event: H3Event, ids: string[], requester?: Guest) {
  const guests = (await party(event).publicState()).guests
  const people = [...new Set(ids)].map((id) => guests.find((guest) => guest.id === id))
  if (people.some((person) => !person))
    throw createError({
      statusCode: 409,
      statusMessage: 'Um participante saiu da festa. Atualize a seleção de cantores.',
    })
  return [
    ...(requester ? [requester] : []),
    ...people.filter((person): person is Guest => !!person && person.id !== requester?.id),
  ]
}
