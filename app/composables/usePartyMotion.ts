export type PartyMotionKind =
  'add' | 'like' | 'dislike' | 'undo' | 'remove' | 'success' | 'playlist'
export interface PartyMotionFeedback {
  id: number
  kind: PartyMotionKind
  message: string
  target?: string
  at: number
}
export type PartyMotionInput = Omit<PartyMotionFeedback, 'id' | 'at'>

/** One short-lived signal per party; reconnect snapshots never replay celebrations. */
export function usePartyMotion() {
  const { storageKey } = usePartyRoute()
  const feedback = useState<PartyMotionFeedback | null>(storageKey('motion-feedback'), () => null)
  function celebrate(input: PartyMotionInput) {
    if (!import.meta.client) return
    feedback.value = { ...input, id: (feedback.value?.id || 0) + 1, at: Date.now() }
  }
  return { feedback, celebrate }
}
