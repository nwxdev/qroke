import { randomUUID } from 'node:crypto'
import type { PartyState, Track } from '../../shared/types'
import { recommendation } from './rules'
import { startNext } from './playback'

interface RadioDependencies {
  state: () => PartyState | Promise<PartyState>
  mutate: (change: (state: PartyState) => void) => void | Promise<void>
  related: (id: string, karaoke: boolean) => Promise<Track[]>
  search: (query: string, karaoke: boolean) => Promise<Track[]>
  local: () => Promise<Track[]>
  warn: (message: string) => void
}
const canContinue = (state: PartyState) =>
  state.autoContinue &&
  !state.current &&
  !state.queue.length &&
  !!state.playerId &&
  !state.playbackIssue?.halted

export class RadioContinuation {
  private running?: Promise<void>
  private again = false
  constructor(private deps: RadioDependencies) {}
  run(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.drain().finally(() => {
      this.running = undefined
    })
    return this.running
  }
  private async drain() {
    do {
      this.again = false
      await this.fill()
    } while (this.again)
  }
  private async fill() {
    const initial = await this.deps.state()
    if (!canContinue(initial)) return
    const last = initial.history.at(-1)
    if (!last) return
    const choose = (tracks: Track[], state = initial) =>
      recommendation(
        tracks.filter(
          (track) =>
            track.karaoke === last.karaoke &&
            (!last.karaoke || track.source === 'local' || /karaok[eê]/iu.test(track.title)),
        ),
        state.history,
        state.queue,
      )
    let candidates: Track[] = []
    if (last.source === 'youtube') {
      try {
        candidates = await this.deps.related(last.id, last.karaoke)
      } catch {}
      // A busca de reserva também parte da última faixa, não de artistas antigos da festa.
      for (const query of [...new Set([last.artist, last.title].filter(Boolean))]) {
        if (choose(candidates)) break
        try {
          candidates.push(...(await this.deps.search(query, last.karaoke)))
        } catch {}
      }
    }
    if (!choose(candidates)) {
      const sameArtist = (track: Track) =>
        track.artist.trim().toLocaleLowerCase('pt-BR') ===
        last.artist.trim().toLocaleLowerCase('pt-BR')
      candidates.push(
        ...(await this.deps.local()).filter(sameArtist),
        ...initial.history.filter((track) => track.outcome === 'ended' && sameArtist(track)),
      )
    }
    let unavailable = false
    await this.deps.mutate((state) => {
      if (!canContinue(state)) return
      // Um pedido pode ter entrado e terminado enquanto a recomendação era consultada.
      if (state.history.at(-1)?.queueId !== last.queueId) {
        this.again = true
        return
      }
      const track = choose(candidates, state)
      if (!track) {
        unavailable = true
        return
      }
      const { id, source, title, artist, duration, thumbnail, karaoke } = track
      state.queue.push({
        id,
        source,
        title,
        artist,
        duration,
        thumbnail,
        karaoke,
        queueId: randomUUID(),
        guestId: 'auto',
        guestName: karaoke ? 'Microfone aberto' : 'Rádio da festa',
        origin: 'auto',
        enqueuedAt: Date.now(),
        round: 0,
        manualOrder: null,
      })
      startNext(state)
    })
    if (unavailable)
      this.deps.warn(
        last.karaoke
          ? 'O rádio não encontrou outro karaokê disponível. Adicione uma música para continuar.'
          : 'O rádio não encontrou outra música disponível. Adicione um pedido para continuar.',
      )
  }
}
