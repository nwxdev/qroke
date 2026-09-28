import type { Guest } from '../../shared/types'
export function karaokeParticipants(ids: string[], requester?: Guest) {
  const guests = party().publicState().guests
  const unique = [...new Set(ids)]
  const people = unique.map((id) => guests.find((guest) => guest.id === id))
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
