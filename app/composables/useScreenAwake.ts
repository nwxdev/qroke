import type { Ref } from 'vue'

export function useScreenAwake(active: Ref<boolean>, playerWindow: Ref<Window | null>) {
  const status = ref<'unavailable' | 'off' | 'active' | 'released'>('unavailable')
  let sentinel: WakeLockSentinel | undefined
  let generation = 0
  let disposed = false
  let target: Window

  async function update() {
    const seq = ++generation
    const previous = sentinel
    sentinel = undefined
    if (previous) await previous.release().catch(() => {})
    if (disposed || seq !== generation) return
    const owner = playerWindow.value || window
    if (!('wakeLock' in owner.navigator)) {
      status.value = 'unavailable'
      return
    }
    if (!active.value) {
      status.value = 'off'
      return
    }
    status.value = 'released'
    if (owner.document.hidden) return
    try {
      const lock = await owner.navigator.wakeLock.request('screen')
      if (disposed || seq !== generation) {
        await lock.release()
        return
      }
      sentinel = lock
      status.value = 'active'
      lock.addEventListener('release', () => {
        if (sentinel !== lock) return
        sentinel = undefined
        status.value = 'released'
      })
    } catch {
      // Low battery, browser policy and permission denial must not interrupt audio.
      if (seq === generation) status.value = 'released'
    }
  }
  function followWindow() {
    target?.document.removeEventListener('visibilitychange', update)
    target = playerWindow.value || window
    target.document.addEventListener('visibilitychange', update)
    void update()
  }
  watch(active, () => void update())
  watch(playerWindow, followWindow, { flush: 'post' })
  onMounted(followWindow)
  onBeforeUnmount(() => {
    disposed = true
    generation++
    target?.document.removeEventListener('visibilitychange', update)
    void sentinel?.release().catch(() => {})
  })
  return { status }
}
