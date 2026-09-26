import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseEnv } from 'node:util'
import { NetworkInvite } from '../core/network-invite'
const exec = promisify(execFile)
export const networkInstance = randomBytes(24).toString('hex')
let monitor: NetworkInvite | undefined
async function addresses() {
  const wsl = !!process.env.WSL_DISTRO_NAME || !!process.env.WSL_INTEROP
  if (wsl || process.platform === 'win32') {
    const command =
      "$indexes = @(Get-NetConnectionProfile | Where-Object NetworkCategory -eq Private | Select-Object -ExpandProperty InterfaceIndex); Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceIndex -in $indexes -and $_.AddressState -eq 'Preferred' } | Select-Object -ExpandProperty IPAddress"
    const binary =
      process.platform === 'win32'
        ? 'powershell.exe'
        : '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
    const { stdout } = await exec(binary, ['-NoProfile', '-NonInteractive', '-Command', command], {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 16384,
    })
    return stdout.trim().split(/\s+/)
  }
  return Object.values(networkInterfaces()).flatMap((items) =>
    (items || [])
      .filter((item) => !item.internal && item.family === 'IPv4')
      .map((item) => item.address),
  )
}
export function networkInvite() {
  return (monitor ||= new NetworkInvite(
    async () => {
      // Só a URL pública é relida. Nenhuma credencial é devolvida ou alterada.
      const env = await readFile(String(useRuntimeConfig().inviteEnvFile), 'utf8')
        .then(parseEnv)
        .catch(() => ({}) as Record<string, string>)
      return env.QROKE_PUBLIC_URL ?? String(useRuntimeConfig().public.partyUrl || '')
    },
    async (url) => {
      const response = await fetch(new URL('/api/network/probe', url), {
        redirect: 'error',
        signal: AbortSignal.timeout(1800),
      })
      if (!response.ok) return false
      const data = (await response.json()) as { instance?: string }
      return data.instance === networkInstance
    },
    addresses,
  ))
}
