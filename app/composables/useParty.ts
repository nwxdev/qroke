import { deviceLabel } from '../utils/device-identity'
import { browserDeviceInfo } from '../utils/device-info'
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
  const $fetch = usePartyFetch()
  const { href, storageKey, id } = usePartyRoute()
  const scope = id.value
  const scopedKey = (key: string) => (scope ? key + ':' + scope : key)
  const clockOffset = useState(scopedKey('server-clock-offset'), () => 0)
  const state = useState<PublicState | null>(scopedKey('party'), () => null)
  const sessionReady = useState(scopedKey('session-ready'), () => false)
  const guest = useState<Guest | null>(scopedKey('guest'), () => null),
    admin = useState(scopedKey('admin'), () => false)
  const adminExpiresAt = useState(scopedKey('admin-expires-at'), () => 0),
    adminLeaseSeconds = useState(scopedKey('admin-lease-seconds'), () => 120),
    adminDialogOpen = useState(scopedKey('admin-dialog-open'), () => false)
  const soundDevice = useState<string | null>(scopedKey('sound-device'), () => null)
  const device = useState<{ id: string; token: string } | null>(scopedKey('device'), () => null)
  const connected = useState(scopedKey('connected'), () => false),
    lastContact = useState(scopedKey('contact'), () => 0)
  const failure = useState(scopedKey('failure'), () => ''),
    pending = useState(scopedKey('pending'), () => false)
  const queueReactions = useState<Record<string, 1 | -1>>(scopedKey('queue-reactions'), () => ({}))
  const votedQueueIds = useState<string[]>(scopedKey('voted-queue-ids'), () => [])
  const optimistic = useState<QueueItem[]>(scopedKey('optimistic'), () => [])
  const queue = computed(() => [...(state.value?.queue || []), ...optimistic.value])
  const isPlayer = computed(() => !!device.value && state.value?.playerId === device.value.id)
  async function refresh() {
    try {
      const next = await $fetch<PublicState>('/api/state', { timeout: 4000 })
      if (!state.value || next.revision >= state.value.revision) state.value = next
      clockOffset.value = (next.serverTime ?? Date.now()) - Date.now()
      connected.value = true
      lastContact.value = Date.now()
    } catch (error) {
      connected.value = false
      const status = (error as { statusCode?: number }).statusCode
      if (import.meta.client && [401, 410].includes(status || 0))
        location.assign(href(status === 410 ? '/encerrada' : '/entrar'))
    }
  }
  async function session() {
    const result = await $fetch<{
      guest: Guest | null
      queueReactions: Record<string, 1 | -1>
      votedQueueIds: string[]
      admin: boolean
      adminExpiresAt: number
      adminLeaseSeconds: number
    }>('/api/session', {
      timeout: 4000,
    })
    guest.value = result.guest
    sessionReady.value = true
    votedQueueIds.value = result.votedQueueIds || []
    queueReactions.value = result.queueReactions || {}
    admin.value = result.admin
    adminExpiresAt.value = result.adminExpiresAt
    adminLeaseSeconds.value = result.adminLeaseSeconds
    if (result.guest)
      try {
        localStorage.setItem(storageKey('qroke:guest'), JSON.stringify(result.guest))
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
  const control = (body: Record<string, unknown>) => {
    const command = ['skip', 'retry'].includes(String(body.action))
      ? { ...body, queueId: state.value?.current?.queueId }
      : body
    if (['skip', 'retry'].includes(String(body.action)) && !state.value?.current)
      return Promise.resolve()
    return act(() => api('/api/control', command))
  }
  function armSound() {
    if (device.value) soundDevice.value = device.value.id
  }
  async function playHere() {
    if (!device.value || pending.value) return
    armSound()
    await control({ action: 'assign', deviceId: device.value.id })
    await nextTick()
    if (isPlayer.value)
      document.querySelector('.media-player')?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'center',
      })
  }
  async function add(track: Track, singers: string[] = []) {
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
      api('/api/queue', {
        id: track.id,
        source: track.source,
        channel: track.media?.channel,
        karaoke: track.karaoke,
        singers,
      }),
    )
    optimistic.value = []
  }
  const vote = (id: string, value: -1 | 0 | 1) =>
    act(() => api('/api/queue/' + id + '/vote', { value }))
  const rename = (name: string) => act(() => api('/api/guest/name', { name }))
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
    clockOffset,
    sessionReady,
    state,
    guest,
    admin,
    adminExpiresAt,
    adminLeaseSeconds,
    adminDialogOpen,
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
    vote,
    votedQueueIds,
    queueReactions,
    rename,
  }
}
export function usePartyConnection() {
  const $fetch = usePartyFetch()
  const { id, page, storageKey } = usePartyRoute()
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
  let deviceInfo: Awaited<ReturnType<typeof browserDeviceInfo>> | undefined
  const details = () =>
    deviceInfo
      ? {
          info: {
            ...deviceInfo,
            view: page.value === '/host' ? 'host' : page.value === '/player' ? 'player' : 'busca',
          },
        }
      : {}
  const nonce = String(Date.now()) + Math.random()
  function connect() {
    if (disposed) return
    socket = new WebSocket(
      (location.protocol === 'https:' ? 'wss:' : 'ws:') +
        '//' +
        location.host +
        '/ws' +
        (id.value ? '?festa=' + id.value : ''),
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
      saved = JSON.parse(sessionStorage.getItem(storageKey('qroke:device')) || 'null')
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
      if (saved) await party.api('/api/device/heartbeat', details())
      else throw new Error('new')
    } catch {
      const label = deviceInfo ? deviceLabel(deviceInfo) : 'Aparelho'
      party.device.value = await $fetch('/api/device', {
        method: 'POST',
        body: { label, ...details() },
        timeout: 5000,
      })
      try {
        sessionStorage.setItem(storageKey('qroke:device'), JSON.stringify(party.device.value))
      } catch {}
    }
  }
  onMounted(async () => {
    if (page.value === '/' || page.value === '/entrar') return
    const access = await $fetch<{ authorized: boolean }>('/api/access').catch(() => null)
    if (!access?.authorized || disposed || page.value === '/' || page.value === '/entrar') return
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(storageKey('qroke-tabs'))
      channel.onmessage = ({ data }) => {
        if (data?.type === 'probe' && data.id === party.device.value?.id)
          channel?.postMessage({ type: 'alive', nonce: data.nonce })
        if (data?.type === 'alive' && data.nonce === nonce) cloned = true
      }
    }
    await party.refresh()
    await party.session().catch(() => {})
    deviceInfo = await browserDeviceInfo()
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
      if (!party.device.value) return
      void party.api('/api/device/heartbeat', details()).catch((error) => {
        if (error?.statusCode === 401 || error?.status === 401) {
          party.device.value = null
          party.soundDevice.value = null
          try {
            sessionStorage.removeItem(storageKey('qroke:device'))
          } catch {}
          party.failure.value =
            'Este aparelho foi removido. Reabra a página para registrá-lo novamente.'
        }
      })
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
