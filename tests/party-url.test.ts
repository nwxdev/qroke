import { describe, expect, it } from 'vitest'
import { partyUrl } from '../app/utils/party-url'
describe('URL compartilhada no QR', () => {
  it('usa a URL da rede mesmo quando o anfitrião abre localhost', () => {
    expect(partyUrl('http://192.168.31.95:3100', 'http://localhost:3100')).toBe(
      'http://192.168.31.95:3100/',
    )
  })
  it('usa a origem LAN e aceita HTTPS configurado', () => {
    expect(partyUrl('', 'http://192.168.31.95:3100')).toBe('http://192.168.31.95:3100/')
    expect(partyUrl('https://festa.example.org/', 'http://localhost:3100')).toBe(
      'https://festa.example.org/',
    )
  })
  it('não publica QR de loopback, endereço de escuta ou URL inválida', () => {
    for (const value of [
      'http://localhost:3100',
      'http://LOCALHOST.:3100',
      'http://festa.localhost',
      'http://127.0.0.1:3100',
      'http://127.2.3.4',
      'http://0.0.0.0:3100',
      'http://[::1]:3100',
      'http://[::]:3100',
      'http://[::ffff:127.0.0.1]',
      'javascript:alert(1)',
      'inválido',
      'https://user:secret@example.org',
    ])
      expect(partyUrl(value, 'http://192.168.1.2')).toBe(null)
    expect(partyUrl('', 'http://localhost:3100')).toBe(null)
  })
})
