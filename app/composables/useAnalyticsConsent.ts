import { PUBLIC_PAGES } from '#shared/site'

export const ANALYTICS_CONSENT_KEY = 'qroke:analytics-consent:v1'
export type AnalyticsConsent = 'accepted' | 'declined' | null

export function useAnalyticsConsent() {
  const config = useRuntimeConfig()
  const route = useRoute()
  const choice = useState<AnalyticsConsent>('qroke:analytics-choice', () => null)
  const ready = useState('qroke:analytics-ready', () => false)
  const opened = useState('qroke:analytics-settings', () => false)
  const enabled = computed(() => /^G-[A-Z0-9]+$/.test(config.public.gaMeasurementId))
  const publicPage = computed(() => Object.hasOwn(PUBLIC_PAGES, route.path))
  function choose(value: Exclude<AnalyticsConsent, null>) {
    choice.value = value
    opened.value = false
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value)
    } catch {}
  }
  return { choice, ready, opened, enabled, publicPage, choose }
}
