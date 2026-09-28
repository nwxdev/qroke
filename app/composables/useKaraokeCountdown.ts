export function useKaraokeCountdown() {
  const { state, clockOffset } = useParty()
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval>
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 100)
  })
  onBeforeUnmount(() => clearInterval(timer))
  const waiting = computed(
    () =>
      !!state.value?.current?.karaoke &&
      (state.value.karaokeLeadSeconds || 0) > 0 &&
      (!state.value.karaokeStartsAt || state.value.karaokeStartsAt > now.value + clockOffset.value),
  )
  const remaining = computed(() =>
    waiting.value
      ? state.value?.karaokeStartsAt
        ? Math.max(
            0,
            Math.ceil((state.value.karaokeStartsAt - now.value - clockOffset.value) / 1000),
          )
        : state.value?.karaokeLeadSeconds || 0
      : 0,
  )
  return { waiting, remaining }
}
