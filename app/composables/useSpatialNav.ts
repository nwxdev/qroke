export function useSpatialNav(
  root: Ref<HTMLElement | null>,
  back: () => void,
  media: (action: 'pause' | 'skip') => void,
) {
  let observer: MutationObserver | undefined
  let previous: HTMLElement | undefined
  const selector = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])'
  const elements = () =>
    Array.from(root.value?.querySelectorAll<HTMLElement>(selector) || []).filter(
      (el) => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true',
    )
  function update() {
    const items = elements()
    const active = items.includes(document.activeElement as HTMLElement)
      ? (document.activeElement as HTMLElement)
      : items.find((el) => el.tabIndex === 0) || items[0]
    for (const el of items) el.tabIndex = el === active ? 0 : -1
    if (
      previous &&
      !items.includes(document.activeElement as HTMLElement) &&
      (document.activeElement === document.body || root.value?.contains(document.activeElement))
    )
      active?.focus()
    if (items.includes(document.activeElement as HTMLElement))
      previous = document.activeElement as HTMLElement
  }
  function key(event: KeyboardEvent) {
    if (
      event.key === 'Backspace' ||
      event.key === 'Escape' ||
      event.keyCode === 10009 ||
      event.keyCode === 461
    ) {
      event.preventDefault()
      back()
      return
    }
    if (event.key === 'MediaPlayPause' || event.key === 'MediaTrackNext') {
      event.preventDefault()
      media(event.key === 'MediaPlayPause' ? 'pause' : 'skip')
      return
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const items = elements(),
      active = document.activeElement as HTMLElement
    if (!items.includes(active)) {
      items[0]?.focus()
      update()
      return
    }
    const rect = active.getBoundingClientRect(),
      x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2
    const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key),
      positive = ['ArrowRight', 'ArrowDown'].includes(event.key)
    const candidates = items
      .filter((el) => el !== active)
      .map((el) => {
        const r = el.getBoundingClientRect(),
          dx = r.x + r.width / 2 - x,
          dy = r.y + r.height / 2 - y
        const primary = horizontal ? dx : dy,
          cross = horizontal ? dy : dx
        return { el, primary, score: Math.abs(primary) + Math.abs(cross) * 2 }
      })
      .filter((c) => (positive ? c.primary > 1 : c.primary < -1))
      .sort((a, b) => a.score - b.score)
    candidates[0]?.el.focus()
    update()
  }
  function focus() {
    update()
  }
  onMounted(() => {
    update()
    root.value?.addEventListener('keydown', key)
    root.value?.addEventListener('focusin', focus)
    observer = new MutationObserver(update)
    if (root.value)
      observer.observe(root.value, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden'],
      })
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    root.value?.removeEventListener('keydown', key)
    root.value?.removeEventListener('focusin', focus)
  })
}
