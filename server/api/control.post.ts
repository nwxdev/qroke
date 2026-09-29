import { previousTrack } from '../core/previous'
import { clearPlaybackIssue, skipTrack, retryTrack } from '../core/playback'
import { z } from 'zod'
import { reorderQueue } from '../core/rules'
const command = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('karaoke-settings'),
    seconds: z.number().int().min(0).max(30),
    music: z.boolean(),
  }),
  z.object({ action: z.literal('assign'), deviceId: z.string().uuid() }),
  z.object({ action: z.literal('pause'), paused: z.boolean() }),
  z.object({ action: z.literal('skip'), queueId: z.string().uuid() }),
  z.object({ action: z.literal('retry'), queueId: z.string().uuid() }),
  z.object({ action: z.literal('volume'), volume: z.number().int().min(0).max(100) }),
  z.object({
    action: z.literal('rename-device'),
    deviceId: z.string().uuid(),
    label: z.string().trim().min(1).max(60),
  }),
  z.object({ action: z.literal('remove-device'), deviceId: z.string().uuid() }),
  z.object({ action: z.literal('previous') }),
  z.object({ action: z.literal('mode'), mode: z.enum(['video', 'music']) }),
  z.object({ action: z.literal('auto'), enabled: z.boolean() }),
  z.object({
    action: z.literal('reorder'),
    ids: z.array(z.string().uuid()),
    revision: z.number().int(),
  }),
  z.object({ action: z.literal('reset-order') }),
])
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const cmd = await readValidatedBody(event, command.parse)
  await requireAdmin(event)
  if (cmd.action === 'assign' && !(await party(event).deviceOnline(cmd.deviceId)))
    throw createError({ statusCode: 409, statusMessage: 'Dispositivo desconectado.' })
  let stale = false
  await party(event).mutate(async (s) => {
    await requireAdmin(event)
    if (cmd.action === 'assign' && !(await party(event).deviceOnline(cmd.deviceId)))
      throw createError({ statusCode: 409, statusMessage: 'Dispositivo desconectado.' })
    switch (cmd.action) {
      case 'assign':
        s.playerReadyAt = Math.max(
          s.playerReadyAt || 0,
          s.playerId && s.playerId !== cmd.deviceId ? Date.now() + 9000 : Date.now(),
        )
        s.playerId = cmd.deviceId
        s.playerVolume = null
        startNext(s)
        break
      case 'pause':
        if (!cmd.paused && s.playbackIssue?.halted)
          throw createError({
            statusCode: 409,
            statusMessage: 'Use Tentar novamente ou Pular para resolver o erro do player.',
          })
        if (cmd.paused && s.karaokeStartsAt && s.karaokeStartsAt > Date.now()) {
          s.karaokeLeadSeconds = Math.max(1, Math.ceil((s.karaokeStartsAt - Date.now()) / 1000))
          s.karaokeStartsAt = null
        }
        s.paused = cmd.paused
        break
      case 'skip':
        stale = !skipTrack(s, cmd.queueId)
        break
      case 'retry':
        stale = !retryTrack(s, cmd.queueId)
        break
      case 'karaoke-settings':
        s.karaokeDelaySeconds = cmd.seconds
        s.karaokeTransitionMusic = cmd.music
        break
      case 'volume':
        s.volume = cmd.volume
        s.playerVolume = null
        break
      case 'rename-device':
        if (!(await party(event).renameDevice(cmd.deviceId, cmd.label)))
          throw createError({ statusCode: 404, statusMessage: 'Aparelho não encontrado.' })
        break
      case 'remove-device':
        await party(event).removeDevice(cmd.deviceId)
        if (s.playerId === cmd.deviceId) {
          s.playerId = null
          s.paused = true
          s.playerReadyAt = Date.now() + 9000
        }
        break
      case 'previous':
        clearPlaybackIssue(s)
        if (!previousTrack(s))
          throw createError({ statusCode: 409, statusMessage: 'Ainda não há uma música anterior.' })
        break
      case 'mode':
        s.mode = cmd.mode
        break
      case 'auto':
        s.autoContinue = cmd.enabled
        if (!cmd.enabled) s.queue = s.queue.filter((t) => t.origin === 'human')
        break
      case 'reset-order':
        s.queue = s.queue.map((t) => ({ ...t, manualOrder: null }))
        break
      case 'reorder':
        if (s.revision !== cmd.revision)
          throw createError({ statusCode: 409, statusMessage: 'A fila mudou; tente novamente.' })
        try {
          s.queue = reorderQueue(s.queue, cmd.ids)
        } catch (error) {
          throw createError({ statusCode: 409, statusMessage: (error as Error).message })
        }
    }
  })
  void continueParty(event)
  return { ok: true, stale }
})
