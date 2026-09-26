import { finishTrack } from '../utils/playback'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  requirePlayer(event)
  const cmd = await readValidatedBody(
    event,
    z.object({
      queueId: z.string().uuid(),
      action: z.enum(['progress', 'ended', 'error']),
      position: z.number().min(0).max(86400).optional(),
      duration: z.number().min(0).max(86400).optional(),
    }).parse,
  )
  if (party().state().current?.queueId !== cmd.queueId) return { stale: true }
  if (cmd.action === 'progress') {
    // Progresso não muda a revisão da fila nem invalida um arrasto em andamento.
    const s = party().state()
    s.position = cmd.position ?? s.position
    s.duration = cmd.duration || s.duration
    party().db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(s))
  } else {
    party().mutate((s) => {
      if (s.current?.queueId === cmd.queueId)
        finishTrack(s, cmd.action === 'ended' ? 'ended' : 'error')
    })
    void continueParty()
  }
  return { ok: true }
})
