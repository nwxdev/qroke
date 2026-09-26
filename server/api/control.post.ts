import { finishTrack } from '../utils/playback'
import { z } from 'zod'
import { reorderQueue } from '../core/rules'
const command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign'), deviceId: z.string().uuid() }),
  z.object({ action: z.literal('pause'), paused: z.boolean() }),
  z.object({ action: z.literal('skip') }),
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
  requireAdmin(event)
  const cmd = await readValidatedBody(event, command.parse)
  if (
    cmd.action === 'assign' &&
    !party()
      .db.prepare('SELECT id FROM devices WHERE id=? AND last_seen>?')
      .get(cmd.deviceId, Date.now() - 20000)
  )
    throw createError({ statusCode: 409, statusMessage: 'Dispositivo desconectado.' })
  party().mutate((s) => {
    switch (cmd.action) {
      case 'assign':
        s.playerReadyAt = s.playerId && s.playerId !== cmd.deviceId ? Date.now() + 9000 : Date.now()
        s.playerId = cmd.deviceId
        startNext(s)
        break
      case 'pause':
        s.paused = cmd.paused
        break
      case 'skip':
        finishTrack(s, 'skipped')
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
  void continueParty()
  return { ok: true }
})
