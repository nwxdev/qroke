import { clearPlaybackIssue, finishTrack, playerFailure } from '../core/playback'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  await requirePlayer(event)
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
  let result: { ok?: boolean; stale?: boolean; halted?: boolean; waiting?: boolean } = { ok: true }
  await party(event).mutate(async (s) => {
    result = { ok: true }
    const player = await requirePlayer(event)
    if (s.current?.queueId !== cmd.queueId) {
      result = { stale: true }
      return
    }
    if (s.playbackIssue?.halted) {
      result = { halted: true }
      return
    }
    if (cmd.action === 'ready') {
      if (s.current.karaoke && (s.karaokeLeadSeconds || 0) > 0 && !s.karaokeStartsAt && !s.paused)
        s.karaokeStartsAt = Date.now() + (s.karaokeLeadSeconds || 0) * 1000
      return
    }
    if (
      s.current.karaoke &&
      (s.karaokeLeadSeconds || 0) > 0 &&
      (!s.karaokeStartsAt || s.karaokeStartsAt > Date.now())
    ) {
      result = { waiting: true }
      return
    }
    if (cmd.action === 'progress') {
      if (cmd.volume !== undefined && cmd.muted !== undefined)
        s.playerVolume = {
          volume: cmd.volume,
          muted: cmd.muted,
          at: Date.now(),
          deviceId: player.id,
        }
      s.position = cmd.position ?? s.position
      s.duration = cmd.duration || s.duration
      if (!s.paused && s.position >= 5) clearPlaybackIssue(s)
    } else if (cmd.action === 'error') {
      if (s.current.source === 'youtube' && cmd.errorCode !== undefined)
        await party(event).blockYoutube(s.current.id, s.current.title, cmd.errorCode)
      playerFailure(s, cmd.queueId, cmd.errorCode)
    } else {
      clearPlaybackIssue(s)
      finishTrack(s, 'ended')
    }
  })
  if (cmd.action === 'ended' || cmd.action === 'error') void continueParty(event)
  return result
})
