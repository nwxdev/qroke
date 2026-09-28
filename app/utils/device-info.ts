import { identifyDevice, type DeviceHints } from './device-identity'
import type { DeviceInfo } from '../../shared/types'
export async function browserDeviceInfo(): Promise<Omit<DeviceInfo, 'view' | 'appVersion'>> {
  const nav = navigator as Navigator & {
    standalone?: boolean
    userAgentData?: DeviceHints & {
      getHighEntropyValues?: (keys: string[]) => Promise<DeviceHints>
    }
  }
  let hints: DeviceHints = nav.userAgentData || {}
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    if (nav.userAgentData?.getHighEntropyValues) {
      const details = await Promise.race([
        nav.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']),
        new Promise<DeviceHints>((resolve) => {
          timeout = setTimeout(() => resolve({}), 700)
        }),
      ])
      hints = { ...hints, ...details }
    }
  } catch {
    /* Usa apenas os dados que o navegador disponibilizar. */
  } finally {
    clearTimeout(timeout)
  }
  return {
    ...identifyDevice(nav.userAgent, hints),
    appMode:
      matchMedia('(display-mode: standalone)').matches || nav.standalone ? 'standalone' : 'browser',
  }
}
