import { describe, expect, it, vi } from 'vitest'
import { NetworkInvite } from '../server/core/network-invite'
describe('monitor do QR', () => {
  it('relê URL alterada sem restart e compartilha uma checagem concorrente', async () => {
    let url = 'http://192.168.1.2:3100',
      now = 0
    const probe = vi.fn(async () => true)
    const monitor = new NetworkInvite(
      async () => url,
      probe,
      async () => [],
      () => now,
    )
    const result = await Promise.all([monitor.check(), monitor.check()])
    expect(probe).toHaveBeenCalledTimes(1)
    expect(result[0]!.url).toBe(url + '/')
    now = 30000
    url = 'http://192.168.1.3:3100'
    expect((await monitor.check()).url).toBe(url + '/')
  })
  it('só troca para um IP da máquina que devolveu a identificação deste servidor', async () => {
    const monitor = new NetworkInvite(
      async () => 'http://192.168.1.2:3100',
      async (url) => url.includes('192.168.1.3'),
      async () => ['8.8.8.8', '192.168.1.3', '192.168.1.4'],
    )
    expect(await monitor.check()).toMatchObject({
      status: 'updated',
      url: 'http://192.168.1.3:3100/',
    })
  })
  it('avisa mudança sem publicar endereço candidato inacessível', async () => {
    const monitor = new NetworkInvite(
      async () => 'http://192.168.1.2:3100',
      async () => false,
      async () => ['192.168.1.3'],
    )
    expect(await monitor.check()).toMatchObject({
      status: 'unreachable',
      url: 'http://192.168.1.2:3100/',
    })
  })
  it('não troca domínio/HTTPS por LAN nem transforma localhost em QR', async () => {
    const discover = vi.fn(async () => ['192.168.1.3'])
    const monitor = new NetworkInvite(
      async () => 'https://festa.example.com',
      async () => false,
      discover,
    )
    expect((await monitor.check()).status).toBe('unreachable')
    expect(discover).not.toHaveBeenCalled()
    const invalid = new NetworkInvite(
      async () => 'http://localhost:3100',
      async () => true,
      discover,
    )
    expect(await invalid.check()).toMatchObject({ status: 'unconfigured', url: '' })
  })
})
