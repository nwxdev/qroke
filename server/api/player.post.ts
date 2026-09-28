import { clearPlaybackIssue, finishTrack, playerFailure } from '../core/playback'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  requirePlayer(event)
  const cmd = await readValidatedBody(
    event,
    z.object({
      queueId: z.string().uuid(),
      action: z.enum(['ready', 'progress', 'ended', 'error']),
      position: z.number().min(0).max(86400).optional(),
      duration: z.number().min(0).max(86400).optional(),
      errorCode: z.number().int().min(0).max(999).optional(),
      volume: z.number().int().min(0).max(100).optional(),
      muted: z.boolean().optional(),
    }).parse,
  )
  const player = requirePlayer(event)
  if (party().state().current?.queueId !== cmd.queueId) return { stale: true }
  if (party().state().playbackIssue?.halted) return { halted: true }
  if (cmd.action === 'ready') {
    const state = party().state()
    if (
      state.current?.karaoke &&
      (state.karaokeLeadSeconds || 0) > 0 &&
      !state.karaokeStartsAt &&
      !state.paused
    )
      party().mutate((s) => {
        s.karaokeStartsAt = Date.now() + (s.karaokeLeadSeconds || 0) * 1000
      })
    return { ok: true }
  }
  const transition = party().state()
  if (
    transition.current?.karaoke &&
    (transition.karaokeLeadSeconds || 0) > 0 &&
    (!transition.karaokeStartsAt || transition.karaokeStartsAt > Date.now())
  )
    return { waiting: true }
  if (cmd.action === 'progress') {
    const s = party().state()
    if (cmd.volume !== undefined && cmd.muted !== undefined)
      s.playerVolume = { volume: cmd.volume, muted: cmd.muted, at: Date.now(), deviceId: player.id }
    s.position = cmd.position ?? s.position
    s.duration = cmd.duration || s.duration
    if (!s.paused && s.position >= 5 && (s.playbackIssue || s.consecutivePlaybackErrors)) {
      party().mutate((current) => {
        current.position = s.position
        current.duration = s.duration
        current.playerVolume = s.playerVolume
        clearPlaybackIssue(current)
      })
    } else party().db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(s))
  } else {
    party().mutate((s) => {
      if (s.current?.queueId !== cmd.queueId) return
      if (cmd.action === 'error') {
        if (s.current.source === 'youtube' && cmd.errorCode !== undefined)
          party().blockYoutube(s.current.id, s.current.title, cmd.errorCode)
        playerFailure(s, cmd.queueId, cmd.errorCode)
      } else {
        clearPlaybackIssue(s)
        finishTrack(s, 'ended')
      }
    })
    void continueParty()
  }
  return { ok: true }
})
