;(() => {
  if (window.parent === window) return
  const { id, site, pages } = JSON.parse(document.getElementById('analytics-config').textContent)
  let started = false
  let lastPath = ''
  let stopped = false
  window.qrokeStopAnalytics = () => {
    stopped = true
    window['ga-disable-' + id] = true
    window.dataLayer.length = 0
  }
  window.dataLayer = []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  window.addEventListener('message', (event) => {
    if (stopped || event.source !== window.parent || event.origin !== location.origin) return
    const data = event.data
    if (
      data?.type !== 'qroke:page-view' ||
      typeof data.path !== 'string' ||
      !Object.hasOwn(pages, data.path)
    )
      return
    if (data.path === lastPath) return
    let referrer = ''
    try {
      const url = new URL(data.referrer)
      if (['http:', 'https:'].includes(url.protocol))
        referrer =
          url.origin === location.origin && Object.hasOwn(pages, url.pathname)
            ? site + url.pathname
            : url.origin + '/'
    } catch {}
    const fields = {
      page_location: site + data.path,
      page_title: pages[data.path].title,
      page_referrer: referrer,
    }
    if (!started) {
      started = true
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
      gtag('js', new Date())
      gtag('config', id, {
        ...fields,
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_domain: 'none',
        cookie_path: '/',
        cookie_expires: 60 * 60 * 24 * 180,
        cookie_flags: 'SameSite=Lax;Secure',
      })
      const script = document.createElement('script')
      script.async = true
      script.referrerPolicy = 'no-referrer'
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id)
      document.head.appendChild(script)
    }
    gtag('set', fields)
    gtag('event', 'page_view', { ...fields, send_to: id })
    lastPath = data.path
  })
})()
