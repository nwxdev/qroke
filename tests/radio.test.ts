import { describe, it, expect, vi, onTestFinished } from 'vitest'
import { randomUUID } from 'node:crypto'
import { PartyDatabase } from '../server/core/database'
import { RadioContinuation } from '../server/core/radio'
import { finishTrack, startNext } from '../server/core/playback'
import type { QueueItem, Track } from '../shared/types'

const track = (id: string, karaoke = true): QueueItem => ({
  id,
  queueId: randomUUID(),
  title: id + (karaoke ? ' Karaokê' : ''),
  source: 'youtube',
  artist: 'Último artista',
  duration: 180,
  thumbnail: '',
  karaoke,
  guestId: 'ana',
  guestName: 'Ana',
  origin: 'human',
  enqueuedAt: Date.now(),
  round: 0,
  manualOrder: null,
})
function fixture(karaoke = true) {
  const db = new PartyDatabase(':memory:')
  onTestFinished(() => db.db.close())
  const last = track('last', karaoke)
  db.mutate((state) => {
    state.autoContinue = true
    state.playerId = randomUUID()
    state.history = [{ ...last, playedAt: Date.now(), outcome: 'ended' }]
  })
  const deps = {
    state: () => db.state(),
    mutate: (change: Parameters<PartyDatabase['mutate']>[0]) => {
      db.mutate(change)
    },
    related: vi.fn(async (_id: string, _karaoke: boolean): Promise<Track[]> => []),
    search: vi.fn(async (_query: string, _karaoke: boolean): Promise<Track[]> => []),
    local: vi.fn(async (): Promise<Track[]> => []),
    warn: vi.fn(),
  }
  return { db, deps, radio: new RadioContinuation(deps), last }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('rádio da última faixa', () => {
  it('encadeia karaokês pela última automática sem repetir playlist ou cantores antigos', async () => {
    const { db, deps, radio } = fixture()
    deps.related
      .mockResolvedValueOnce([
        {
          ...track('k1'),
          singers: [{ id: 'ana', name: 'Ana' }],
          playlist: { id: 'pl', title: 'Antiga' },
        } as QueueItem,
      ])
      .mockResolvedValueOnce([track('k2')])
    await radio.run()
    expect(deps.related).toHaveBeenNthCalledWith(1, 'last', true)
    expect(db.state().current).toMatchObject({
      id: 'k1',
      karaoke: true,
      origin: 'auto',
      guestName: 'Microfone aberto',
    })
    expect(db.state().current?.playlist).toBeUndefined()
    expect(db.state().current?.singers).toBeUndefined()
    expect(db.state().karaokeLeadSeconds).toBe(5)
    db.mutate((state) => finishTrack(state, 'ended'))
    await radio.run()
    expect(deps.related).toHaveBeenNthCalledWith(2, 'k1', true)
    expect(db.state().current?.id).toBe('k2')
  })
  it('não consulta rádio com fila, faixa atual, rádio desligado, erro pausado ou sem PLAYER', async () => {
    for (const condition of ['queue', 'current', 'off', 'halted', 'device']) {
      const { db, deps, radio } = fixture()
      db.mutate((state) => {
        if (condition === 'queue') state.queue.push(track('request', false))
        if (condition === 'current') state.current = track('playing')
        if (condition === 'off') state.autoContinue = false
        if (condition === 'device') state.playerId = null
        if (condition === 'halted')
          state.playbackIssue = {
            queueId: 'last',
            videoId: 'last',
            title: 'Erro',
            source: 'youtube',
            message: 'Erro',
            halted: true,
            at: Date.now(),
          }
      })
      await radio.run()
      expect(deps.related).not.toHaveBeenCalled()
      expect(deps.local).not.toHaveBeenCalled()
    }
  })
  it('pedido normal toca antes do rádio e muda a referência e o modo da próxima automática', async () => {
    const { db, deps, radio } = fixture()
    deps.related.mockResolvedValueOnce([track('k1')]).mockResolvedValueOnce([track('n1', false)])
    await radio.run()
    db.mutate((state) => state.queue.push(track('pedido-normal', false)))
    await radio.run()
    expect(deps.related).toHaveBeenCalledTimes(1)
    db.mutate((state) => finishTrack(state, 'ended'))
    expect(db.state().current?.id).toBe('pedido-normal')
    expect(db.state().current?.karaoke).toBe(false)
    db.mutate((state) => finishTrack(state, 'ended'))
    await radio.run()
    expect(deps.related).toHaveBeenLastCalledWith('pedido-normal', false)
    expect(db.state().current).toMatchObject({ id: 'n1', karaoke: false, origin: 'auto' })
    expect(db.state().karaokeLeadSeconds).toBe(0)
  })
  it('descarta recomendação em andamento se um pedido entrar e mantém uma única consulta', async () => {
    const { db, deps, radio } = fixture()
    const pending = deferred<Track[]>()
    deps.related.mockReturnValue(pending.promise)
    const first = radio.run(),
      duplicate = radio.run()
    expect(first).toBe(duplicate)
    db.mutate((state) => {
      state.queue.push(track('normal', false))
      startNext(state)
    })
    pending.resolve([track('late')])
    await first
    expect(db.state().current?.id).toBe('normal')
    expect(db.state().queue).toHaveLength(0)
    expect(deps.related).toHaveBeenCalledTimes(1)
  })
  it('refaz a consulta se uma música nova também terminou enquanto a antiga estava pendente', async () => {
    const { db, deps, radio } = fixture()
    const pending = deferred<Track[]>()
    deps.related
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce([track('radio-normal', false)])
    const first = radio.run()
    db.mutate((state) => {
      state.queue.push(track('nova-normal', false))
      startNext(state)
      finishTrack(state, 'ended')
    })
    pending.resolve([track('old-karaoke')])
    await first
    expect(deps.related).toHaveBeenLastCalledWith('nova-normal', false)
    expect(db.state().current?.id).toBe('radio-normal')
  })
  it.each(['off', 'device'])(
    'não insere a automática após %s durante a consulta',
    async (condition) => {
      const { db, deps, radio } = fixture()
      const pending = deferred<Track[]>()
      deps.related.mockReturnValue(pending.promise)
      const running = radio.run()
      db.mutate((state) => {
        if (condition === 'off') state.autoContinue = false
        else state.playerId = null
      })
      pending.resolve([track('late')])
      await running
      expect(db.state().current).toBeNull()
      expect(db.state().queue).toHaveLength(0)
    },
  )
  it('busca pelo último artista no mesmo modo e não troca para gravação comum por falta de karaokê', async () => {
    const { db, deps, radio, last } = fixture()
    deps.related.mockResolvedValue([track('normal', false)])
    deps.search.mockResolvedValue([{ ...track('falso'), title: 'Gravação comum' }])
    deps.local.mockResolvedValue([{ ...track('local', false), source: 'local' }])
    await radio.run()
    expect(deps.search).toHaveBeenNthCalledWith(1, last.artist, true)
    expect(deps.search).toHaveBeenNthCalledWith(2, last.title, true)
    expect(db.state().current).toBeNull()
    expect(deps.warn).toHaveBeenCalledWith(expect.stringContaining('outro karaokê'))
  })
  it('respeita a ordem recomendada e não repete faixas recentes, puladas ou com erro', async () => {
    const { db, deps, radio } = fixture(false)
    db.mutate((state) => {
      state.history.push({ ...track('skipped', false), playedAt: 1, outcome: 'skipped' })
      state.history.push({ ...track('error', false), playedAt: 1, outcome: 'error' })
    })
    deps.related.mockResolvedValue([
      track('last', false),
      track('skipped', false),
      track('error', false),
      { ...track('recommended', false), artist: 'Outro artista' },
      track('later', false),
    ])
    await radio.run()
    expect(db.state().current?.id).toBe('recommended')
  })
})
