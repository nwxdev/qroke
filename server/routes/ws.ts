const connections = new Map<string, () => void>()
export default defineWebSocketHandler({
  open(peer) {
    const notify = () => {
      try {
        peer.send(JSON.stringify({ type: 'changed' }))
      } catch {}
    }
    connections.set(peer.id, notify)
    party().listeners.add(notify)
    notify()
  },
  close(peer) {
    const notify = connections.get(peer.id)
    if (notify) party().listeners.delete(notify)
    connections.delete(peer.id)
  },
  error(peer) {
    const notify = connections.get(peer.id)
    if (notify) party().listeners.delete(notify)
    connections.delete(peer.id)
  },
})
