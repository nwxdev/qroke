import { expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { Catalog, musicProvider } from '../server/core/catalog'
import { initialState } from '../server/core/database'
import { RadioContinuation } from '../server/core/radio'

it('YouTube real: rádio encontra próximo karaokê a partir da última faixa, sem alterar a festa', async () => {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('Configure YOUTUBE_API_KEY no .env antes deste teste opt-in.')
  const catalog = new Catalog(
    musicProvider(),
    key,
    () => false,
    () => {},
  )
  const seeds = await catalog.search('Evidências', true)
  const seed = seeds.find((track) => /karaok[eê]/iu.test(track.title))
  expect(seed).toBeDefined()
  const state = initialState()
  state.autoContinue = true
  state.playerId = randomUUID()
  state.history = [
    {
      ...seed!,
      queueId: randomUUID(),
      guestId: 'test',
      guestName: 'Teste',
      origin: 'human',
      enqueuedAt: Date.now(),
      round: 0,
      manualOrder: null,
      playedAt: Date.now(),
      outcome: 'ended',
    },
  ]
  const radio = new RadioContinuation({
    state: () => structuredClone(state),
    mutate: (change) => {
      change(state)
    },
    related: (id, karaoke) => catalog.related(id, karaoke),
    search: (query, karaoke) => catalog.search(query, karaoke),
    local: async () => [],
    warn: () => {},
  })
  await radio.run()
  expect(state.current?.source).toBe('youtube')
  expect(state.current?.karaoke).toBe(true)
  expect(state.current?.origin).toBe('auto')
  expect(state.current?.id).not.toBe(seed!.id)
  expect(state.current?.title).toMatch(/karaok[eê]/iu)
  console.log(
    'Rádio real: próximo karaokê elegível validado; estado isolado em memória, sem inserir na festa.',
  )
})
