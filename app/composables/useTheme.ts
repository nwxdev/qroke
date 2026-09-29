import { useQuasar } from 'quasar'
export function useTheme() {
  const route = useRoute(),
    q = useQuasar()
  const light = useState('theme-light', () => false)
  function apply() {
    if (!import.meta.client) return
    try {
      light.value = localStorage.getItem('qroke:theme:' + route.path) === 'light'
    } catch {
      light.value = false
    }
    document.documentElement.dataset.theme = light.value ? 'light' : 'dark'
    q.dark.set(!light.value)
  }
  function toggle() {
    light.value = !light.value
    try {
      localStorage.setItem('qroke:theme:' + route.path, light.value ? 'light' : 'dark')
    } catch {}
    apply()
  }
  onMounted(apply)
  return { light, toggle, apply }
}
