import type { PublicState, Guest, QueueItem, Track } from '../../shared/types'
export function errorText(error: unknown) {
  const e = error as { data?: { statusMessage?: string; message?: string }; message?: string }
  return (
    e.data?.statusMessage ||
    e.data?.message ||
    e.message ||
    'Não foi possível concluir. Tente novamente.'
  )
}
export function useParty() {
  const state = useState<PublicState | null>('party', () => null)
  const guest = useState<Guest | null>('guest', () => null),
    admin = useState('admin', () => false)
  const soundDevice = useState<string | null>('sound-device', () => null)
  const device = useState<{ id: string; token: string } | null>('device', () => null)
  const connected = useState('connected', () => false),
    lastContact = useState('contact', () => 0)
  const failure = useState('failure', () => ''),
    pending = useState('pending', () => false)
  const optimistic = useState<QueueItem[]>('optimistic', () => [])
  const queue = computed(() => [...(state.value?.queue || []), ...optimistic.value])
  const isPlayer = computed(() => !!device.value && state.value?.playerId === device.value.id)
  async function refresh() {
    try {
      const next = await $fetch<PublicState>('/api/state', { timeout: 4000 })
      if (!state.value || next.revision >= state.value.revision) state.value = next
      connected.value = true
      lastContact.value = Date.now()
    } catch {
      connected.value = false
    }
  }
  async function session() {
    const result = await $fetch<{ guest: Guest | null; admin: boolean }>('/api/session', {
      timeout: 4000,
    })
    guest.value = result.guest
    admin.value = result.admin
    if (result.guest)
      try {
        localStorage.setItem('qroke:guest', JSON.stringify(result.guest))
      } catch {}
  }
  async function api(
    path: string,
    body: Record<string, unknown>,
    method: 'POST' | 'DELETE' = 'POST',
  ) {
    return $fetch(path, {
      method,
      body,
      timeout: 10000,
      headers: device.value ? { 'x-qroke-device-key': device.value.token } : undefined,
    })
  }
  async function act(action: () => Promise<unknown>) {
    if (pending.value) return
    pending.value = true
    failure.value = ''
    try {
      await action()
      await refresh()
      await session()
    } catch (error) {
      failure.value = errorText(error)
      await session().catch(() => {})
    } finally {
      pending.value = false
    }
  }
  const control = (body: Record<string, unknown>) => act(() => api('/api/control', body))
  function armSound() {
    if (device.value) soundDevice.value = device.value.id
  }
  async function playHere() {
    if (!device.value || pending.value) return
    armSound()
    await control({ action: 'assign', deviceId: device.value.id })
    await nextTick()
    if (isPlayer.value)
      document
        .querySelector('.media-player')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  async function add(track: Track) {
    if (!guest.value || pending.value) return
    const temp: QueueItem = {
      ...track,
      queueId: 'pending',
      guestId: guest.value.id,
      guestName: guest.value.name,
      origin: 'human',
      enqueuedAt: Date.now(),
      round: 0,
      manualOrder: null,
    }
    optimistic.value = [temp]
    await act(() =>
      api('/api/queue', { id: track.id, source: track.source, karaoke: track.karaoke }),
    )
    optimistic.value = []
  }
  const remove = (id: string) => act(() => api('/api/queue/' + id, {}, 'DELETE'))
  async function reorder(items: QueueItem[]) {
    if (!state.value || pending.value) return
    const previous = [...state.value.queue],
      revision = state.value.revision
    state.value.queue = items
    await act(async () => {
      try {
        await api('/api/control', { action: 'reorder', ids: items.map((t) => t.queueId), revision })
      } catch (error) {
        if (state.value) state.value.queue = previous
        throw error
      }
    })
  }
  return {
    state,
    guest,
    admin,
    device,
    connected,
    lastContact,
    failure,
    pending,
    queue,
    isPlayer,
    soundDevice,
    armSound,
    playHere,
    refresh,
    session,
    api,
    act,
    control,
    add,
    remove,
    reorder,
  }
}
export function usePartyConnection() {
  const party = useParty(),
    route = useRoute()
  let poll: ReturnType<typeof setInterval>,
    beat: ReturnType<typeof setInterval>,
    socket: WebSocket | undefined,
    retry: ReturnType<typeof setTimeout>
  let disposed = false,
    busy = false
  let channel: BroadcastChannel | undefined,
    cloned = false
  const nonce = String(Date.now()) + Math.random()
  function connect() {
    if (disposed) return
    socket = new WebSocket(
      (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws',
    )
    socket.onmessage = () => {
      void party.refresh()
    }
    socket.onclose = () => {
      if (!disposed) retry = setTimeout(connect, 3000)
    }
    socket.onerror = () => socket?.close()
  }
  async function register() {
    let saved: null | { id: string; token: string } = null
    try {
      saved = JSON.parse(sessionStorage.getItem('qroke:device') || 'null')
    } catch {}
    if (saved && channel) {
      cloned = false
      channel.postMessage({ type: 'probe', id: saved.id, nonce })
      await new Promise((resolve) => setTimeout(resolve, 150))
      if (cloned) saved = null
    } else if (saved && !channel) {
      saved = null
    }
    party.device.value = saved
    try {
      if (saved) await party.api('/api/device/heartbeat', {})
      else throw new Error('new')
    } catch {
      const label =
        (route.path === '/tv' ? 'TV' : route.path === '/host' ? 'Host' : 'Celular') +
        ' · ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      party.device.value = await $fetch('/api/device', {
        method: 'POST',
        body: { label },
        timeout: 5000,
      })
      try {
        sessionStorage.setItem('qroke:device', JSON.stringify(party.device.value))
      } catch {}
    }
  }
  onMounted(async () => {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('qroke-tabs')
      channel.onmessage = ({ data }) => {
        if (data?.type === 'probe' && data.id === party.device.value?.id)
          channel?.postMessage({ type: 'alive', nonce: data.nonce })
        if (data?.type === 'alive' && data.nonce === nonce) cloned = true
      }
    }
    await party.refresh()
    await party.session().catch(() => {})
    await register().catch((e) => {
      party.failure.value = errorText(e)
    })
    if (disposed) return
    connect()
    poll = setInterval(async () => {
      if (busy) return
      busy = true
      await party.refresh()
      await party.session().catch(() => {})
      busy = false
    }, 2000)
    beat = setInterval(() => {
      void party.api('/api/device/heartbeat', {}).catch(() => {})
    }, 5000)
  })
  onBeforeUnmount(() => {
    disposed = true
    clearInterval(poll)
    clearInterval(beat)
    clearTimeout(retry)
    socket?.close()
    channel?.close()
  })
}
