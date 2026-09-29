import { startNext as nextTrack, finishTrack as completeTrack } from '../core/playback'
import { RadioContinuation } from '../core/radio'
import type { PartyState } from '../../shared/types'
export function startNext(s: PartyState) {
  nextTrack(s)
}
export function finishTrack(s: PartyState, outcome: 'ended' | 'skipped' | 'error') {
  completeTrack(s, outcome)
}
let radio: RadioContinuation | undefined
export function continueParty() {
  radio ||= new RadioContinuation({
    state: () => party().state(),
    mutate: (change) => {
      party().mutate(change)
    },
    related: (id, karaoke) => catalog().related(id, karaoke),
    search: (query, karaoke) => catalog().search(query, karaoke),
    local: async () => (await library()).search(''),
    warn: publishWarning,
  })
  return radio.run().catch(() => {
    publishWarning(
      'Não foi possível continuar automaticamente. Adicione uma faixa ou tente novamente.',
    )
  })
}
