type InstallEvent = Event & { prompt: () => Promise<{ outcome: string }> }
export default defineNuxtPlugin(() => {
  const available = useState('pwa-available', () => false)
  const installed = useState('pwa-installed', () => false)
  const mode = matchMedia('(display-mode: standalone)')
  installed.value = mode.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone
  let prompt: InstallEvent | null = null
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    prompt = event as InstallEvent
    available.value = true
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    available.value = false
    prompt = null
  })
  mode.addEventListener('change', () => {
    if (mode.matches) installed.value = true
  })
  if ('serviceWorker' in navigator && window.isSecureContext)
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
  async function install() {
    if (!prompt) return false
    const event = prompt
    prompt = null
    available.value = false
    await event.prompt()
    return true
  }
  return { provide: { installPwa: install } }
})
