export function useAdminLease() {
  const { adminExpiresAt } = useParty()
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval>
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onBeforeUnmount(() => clearInterval(timer))
  const remaining = computed(() =>
    Math.max(0, Math.ceil((adminExpiresAt.value - now.value) / 1000)),
  )
  const remainingLabel = computed(
    () => Math.floor(remaining.value / 60) + ':' + String(remaining.value % 60).padStart(2, '0'),
  )
  return { remaining, remainingLabel }
}
