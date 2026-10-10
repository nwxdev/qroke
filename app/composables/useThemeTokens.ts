export function useThemeTokens() {
  const { light } = useTheme()
  const fieldProps = computed(() => ({ outlined: true, color: 'primary', dark: !light.value }))
  const buttonProps = computed(() => ({ color: 'primary', noCaps: true, unelevated: true }))
  const toggleProps = computed(() => ({ color: 'primary', dark: !light.value }))
  return { fieldProps, buttonProps, toggleProps }
}
