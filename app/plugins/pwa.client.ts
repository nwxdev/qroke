type InstallEvent = Event & { prompt: () => Promise<{ outcome: string }> }
type RelatedApp = { platform?: string; id?: string; url?: string }
export default defineNuxtPlugin(() => {
  const available = useState('pwa-available', () => false)
  const installed = useState('pwa-installed', () => false)
  const standalone = useState('pwa-standalone', () => false)
  const mode = matchMedia('(display-mode: standalone)')
  const nav = navigator as Navigator & {
    standalone?: boolean
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>
  }
  let prompt: InstallEvent | null = null
  let checking = false
  async function detect() {
    standalone.value = mode.matches || !!nav.standalone
    if (standalone.value) {
      installed.value = true
      return
    }
    if (checking || !nav.getInstalledRelatedApps) return
    checking = true
    try {
      const apps = await nav.getInstalledRelatedApps()
      installed.value = apps.some(
        (app) =>
          app.platform === 'webapp' &&
          ((app.url &&
            new URL(app.url, location.origin).href === location.origin + '/site.webmanifest') ||
            (app.id && new URL(app.id, location.origin).href === location.origin + '/')),
      )
    } catch {
      /* Unsupported detection is unknown, never proof of installation. */
    } finally {
      checking = false
    }
  }
  void detect()
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    prompt = event as InstallEvent
    available.value = true
    if (!standalone.value) installed.value = false
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    available.value = false
    prompt = null
  })
  mode.addEventListener('change', detect)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void detect()
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
