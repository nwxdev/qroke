import { PUBLIC_PAGES } from '#shared/site'
import { ANALYTICS_CONSENT_KEY, type AnalyticsConsent } from '../composables/useAnalyticsConsent'

// Keep the Google tag in a disposable document, away from invitation URLs,
// party forms and SPA history. Only allowlisted public paths cross this boundary.
export default defineNuxtPlugin((app) => {
  const { choice, ready, enabled } = useAnalyticsConsent()
  const router = useRouter()
  let frame: HTMLIFrameElement | null = null
  let loaded = false
  let lastPath = ''
  let referrer = ''
  try {
    referrer = new URL(document.referrer).origin + '/'
  } catch {}
  function readChoice(): AnalyticsConsent {
    try {
      const value = localStorage.getItem(ANALYTICS_CONSENT_KEY)
      if (value === 'accepted' || value === 'declined') return value
    } catch {}
    return null
  }
  function removeFrame() {
    const child = frame?.contentWindow as (Window & { qrokeStopAnalytics?: () => void }) | null
    child?.qrokeStopAnalytics?.()
    frame?.remove()
    frame = null
    loaded = false
    lastPath = ''
  }
  function clearCookies() {
    const names = document.cookie.split(';').map((cookie) => cookie.trim().split('=')[0]!)
    // The tag uses host-only cookies at /. Preserve app, session and other cookies.
    for (const name of names.filter((name) => /^_ga(?:_|$)/.test(name)))
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax'
  }
  function sendPage() {
    const path = router.currentRoute.value.path
    if (!frame || !loaded || choice.value !== 'accepted' || !Object.hasOwn(PUBLIC_PAGES, path))
      return
    if (lastPath === path) return
    frame.contentWindow?.postMessage({ type: 'qroke:page-view', path, referrer }, location.origin)
    lastPath = path
    referrer = new URL(path, location.origin).href
  }
  function sync() {
    if (
      !enabled.value ||
      choice.value !== 'accepted' ||
      !Object.hasOwn(PUBLIC_PAGES, router.currentRoute.value.path)
    ) {
      removeFrame()
      if (choice.value !== 'accepted') clearCookies()
      return
    }
    if (!frame) {
      frame = document.createElement('iframe')
      frame.src = '/analytics-frame'
      frame.hidden = true
      frame.title = 'Medição de visitas'
      frame.setAttribute('aria-hidden', 'true')
      frame.tabIndex = -1
      frame.referrerPolicy = 'no-referrer'
      const current = frame
      frame.onload = () => {
        if (frame !== current) return
        loaded = true
        sendPage()
      }
      document.body.appendChild(frame)
    } else sendPage()
  }
  app.hook('app:mounted', () => {
    choice.value = readChoice()
    ready.value = true
    sync()
  })
  watch(choice, sync, { flush: 'sync' })
  router.beforeEach((to) => {
    if (!Object.hasOwn(PUBLIC_PAGES, to.path)) removeFrame()
  })
  router.afterEach((_to, _from, failure) => {
    if (!failure && ready.value) sync()
  })
  window.addEventListener('storage', (event) => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) choice.value = readChoice()
  })
})
