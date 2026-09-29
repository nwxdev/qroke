import type { H3Event } from 'h3'
import { startNext as nextTrack, finishTrack as completeTrack } from '../core/playback'
import { RadioContinuation } from '../core/radio'
import type { PartyState } from '../../shared/types'
export function startNext(s: PartyState) {
  nextTrack(s)
}
export function finishTrack(s: PartyState, outcome: 'ended' | 'skipped' | 'error') {
  completeTrack(s, outcome)
}
export async function continueParty(event: H3Event) {
  const database = party(event)
  try {
    const songs = await catalog(event)
    const radio = new RadioContinuation({
      state: () => database.state(),
      mutate: async (change) => {
        await database.mutate(change)
      },
      related: (id, karaoke) => songs.related(id, karaoke),
      search: (query, karaoke) => songs.search(query, karaoke),
      local: async () => (await library()).search(''),
      warn: (message) => {
        void publishWarning(database, message).catch(() => {})
      },
    })
    await radio.run()
  } catch {
    await publishWarning(
      database,
      'Não foi possível continuar automaticamente. Adicione uma faixa ou tente novamente.',
    ).catch(() => {})
  }
}
