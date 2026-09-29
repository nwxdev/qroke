import type { InviteStatus } from '../../shared/network'
import { partyUrl } from '../../app/utils/party-url'
export function privateIPv4(host: string) {
  const parts = host.split('.').map(Number)
  return (
    parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    (parts[0] === 10 ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31))
  )
}
export class NetworkInvite {
  private configured = ''
  private effective = ''
  private cached?: InviteStatus
  private pending?: Promise<InviteStatus>
  constructor(
    private readUrl: () => Promise<string>,
    private probe: (url: string) => Promise<boolean>,
    private discover: () => Promise<string[]>,
    private now = Date.now,
  ) {}
  check() {
    if (this.cached && this.now() - this.cached.checkedAt < 15000)
      return Promise.resolve(this.cached)
    return (this.pending ||= this.inspect()
      .then((result) => (this.cached = result))
      .finally(() => {
        this.pending = undefined
      }))
  }
  private async inspect(): Promise<InviteStatus> {
    const raw = await this.readUrl().catch(() => '')
    const configured = partyUrl(raw, '') || ''
    if (configured !== this.configured) {
      this.configured = configured
      this.effective = configured
    }
    const result = (
      status: InviteStatus['status'],
      message: string,
      url = this.effective,
    ): InviteStatus => ({ url, status, message, checkedAt: this.now() })
    if (!configured)
      return result('unconfigured', 'Configure o endereço da rede para compartilhar o convite.', '')
    if (await this.probe(this.effective).catch(() => false))
      return result(
        this.effective === configured ? 'ok' : 'updated',
        this.effective === configured
          ? 'Servidor alcançável neste endereço.'
          : 'IP atualizado automaticamente. Escaneie o QR atual.',
      )
    const url = new URL(configured)
    if (privateIPv4(url.hostname)) {
      const addresses = [...new Set(await this.discover().catch(() => []))]
        .filter(privateIPv4)
        .slice(0, 4)
      const candidates = addresses
        .filter((ip) => ip !== new URL(this.effective).hostname)
        .map((ip) => {
          const candidate = new URL(configured)
          candidate.hostname = ip
          return candidate.origin + '/'
        })
      const checked = await Promise.all(
        candidates.map(async (candidate) =>
          (await this.probe(candidate).catch(() => false)) ? candidate : '',
        ),
      )
      const working = checked.find(Boolean)
      if (working) {
        this.effective = working
        return result(
          'updated',
          'O endereço mudou. QR atualizado automaticamente; escaneie novamente.',
        )
      }
      const changed = addresses.find((ip) => ip !== url.hostname)
      if (changed && !addresses.includes(url.hostname))
        return result(
          'unreachable',
          'O IP da máquina mudou para ' +
            changed +
            '. O anfitrião precisa atualizar o acesso da rede; o QR será atualizado quando o servidor responder.',
        )
    }
    return result(
      'unreachable',
      'Não foi possível confirmar o acesso pela rede. Confira Wi-Fi, servidor e encaminhamento de porta. A verificação será repetida automaticamente.',
    )
  }
}
