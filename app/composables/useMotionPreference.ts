export function useMotionPreference() {
  const enabled = useState('qroke:motion-enabled', () => true)
  const reduced = useState('qroke:motion-reduced', () => false)
  let media: MediaQueryList | undefined
  function sync() {
    if (!import.meta.client) return
    reduced.value = !!media?.matches
    enabled.value = true
    try {
      // Retire the old opt-out so likes and other reactions start animated.
      if (localStorage.getItem('qroke:motion') !== 'on') localStorage.setItem('qroke:motion', 'on')
    } catch {}
    document.documentElement.dataset.motion = enabled.value ? 'on' : 'off'
  }
  function toggle() {
    enabled.value = !enabled.value
    document.documentElement.dataset.motion = enabled.value ? 'on' : 'off'
    try {
      localStorage.setItem('qroke:motion', enabled.value ? 'on' : 'off')
    } catch {}
  }
  function storage(event: StorageEvent) {
    if (event.key === 'qroke:motion' || event.key === null) sync()
  }
  onMounted(() => {
    media = matchMedia('(prefers-reduced-motion: reduce)')
    sync()
    media.addEventListener('change', sync)
    window.addEventListener('storage', storage)
  })
  onBeforeUnmount(() => {
    media?.removeEventListener('change', sync)
    window.removeEventListener('storage', storage)
  })
  return { enabled, reduced, toggle }
}
