import { z } from 'zod'
import pkg from '../../package.json'
const description = z
  .string()
  .trim()
  .max(64)
  .regex(/^[^\u0000-\u001f\u007f-\u009f]*$/)
export const deviceInfoSchema = z.object({
  kind: z.enum(['phone', 'tablet', 'computer', 'tv', 'unknown']),
  platform: description,
  platformVersion: description,
  browser: description,
  browserVersion: description,
  model: description,
  appMode: z.enum(['browser', 'standalone']),
  view: z.enum(['host', 'player', 'busca']),
})
export function storedDeviceInfo(info: z.infer<typeof deviceInfoSchema>) {
  return JSON.stringify({ ...info, appVersion: pkg.version })
}
