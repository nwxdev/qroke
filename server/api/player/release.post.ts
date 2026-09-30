import { z } from 'zod'
import { releasePlayer } from '../../core/handoff'
export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  const input = await readValidatedBody(
    event,
    z.object({
      handoffId: z.string().uuid(),
      queueId: z.string().uuid().nullable(),
      position: z.number().min(0).max(86400),
    }).parse,
  )
  const transfer = (await party(event).state()).playerHandoff
  if (!transfer || transfer.id !== input.handoffId || transfer.from !== device.id)
    return { released: false }
  let released = false
  await party(event).mutate(async (state) => {
    await requireDevice(event)
    released = releasePlayer(state, device.id, input)
  })
  return { released }
})
