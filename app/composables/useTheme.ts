import { useQuasar, setCssVar } from 'quasar'
export function useTheme() {
  const route = useRoute(),
    q = useQuasar()
  const light = useState('theme-light', () => false)
  function syncTokens() {
    if (!import.meta.client) return
    const style = getComputedStyle(document.documentElement)
    for (const [brand, token] of Object.entries({
      primary: 'accent',
      secondary: 'secondary',
      accent: 'highlight',
      dark: 'surface',
      'dark-page': 'bg',
      positive: 'positive',
      negative: 'negative',
      info: 'info',
      warning: 'warning',
    })) {
      const value = style.getPropertyValue('--' + token).trim()
      if (value) setCssVar(brand, value)
    }
    q.dark.set(!light.value)
  }
  function apply() {
    if (!import.meta.client) return
    try {
      light.value = localStorage.getItem('qroke:theme:' + route.path) === 'light'
    } catch {
      light.value = false
    }
    document.documentElement.dataset.theme = light.value ? 'light' : 'dark'
    syncTokens()
  }
  function toggle() {
    light.value = !light.value
    try {
      localStorage.setItem('qroke:theme:' + route.path, light.value ? 'light' : 'dark')
    } catch {}
    apply()
  }
  onMounted(apply)
  return { light, toggle, apply, syncTokens }
}
