import { describe, expect, it } from 'vitest'
import { parsePartyInvite } from '../app/utils/party-invite'
const origin = 'https://qroke.com.br'
describe('Convites recebidos por link ou câmera', () => {
  it('aceita convite público, link relativo, domínio sem protocolo e rotas da festa', () => {
    for (const value of [
      origin + '/f/f1.abc#convite=token_123',
      '/f/f1.abc#convite=token_123',
      'qroke.com.br/f/f1.abc#convite=token_123',
      origin + '/f/f1.abc/player#convite=token_123',
      '  ' + origin + '/f/f1.abc/#convite=token_123  ',
    ])
      expect(parsePartyInvite(value, origin)).toEqual({ partyId: 'f1.abc', token: 'token_123' })
  })
  it('permite retomar uma festa sem expor o token e aceita convites anteriores do domínio atual', () => {
    expect(parsePartyInvite('/f/f1.abc/host', origin)).toEqual({ partyId: 'f1.abc', token: null })
    expect(parsePartyInvite('/#convite=abc&festa=f1.abc', origin)).toEqual({
      partyId: 'f1.abc',
      token: 'abc',
    })
    expect(parsePartyInvite('/entrar?festa=f1.abc#convite=abc', origin)).toEqual({
      partyId: 'f1.abc',
      token: 'abc',
    })
    expect(parsePartyInvite('/#convite=abc', origin)).toEqual({ partyId: '', token: 'abc' })
  })
  it.each([
    '',
    'texto qualquer',
    '/',
    '/busca',
    '/api/f/f1.abc/access#convite=abc',
    'https://example.org/f/f1.abc#convite=abc',
    '//example.org/f/f1.abc#convite=abc',
    'https://qroke.nwx.ag/f/f1.abc#convite=abc',
    'http://qroke.com.br/f/f1.abc#convite=abc',
    'https://qroke.com.br.example.org/f/f1.abc#convite=abc',
    'https://qroke.com.br@example.org/f/f1.abc#convite=abc',
    'https://user:password@qroke.com.br/f/f1.abc#convite=abc',
    'javascript:alert(1)',
    'data:text/html,hello',
    '/f/f1.abc#convite=',
    '/f/f1.abc#convite=a&convite=b',
    '/f/f1.abc#convite=a&festa=f1.other',
    '/f/f1.abc?festa=f1.other#convite=a',
    '/#festa=f1.abc&festa=f1.other&convite=a',
    '/f/f1.abc#convite=%00',
    '/f/f1.abc#convite=%20',
    '/f/f1%2Fabc#convite=abc',
    '/f/' + 'a'.repeat(65) + '#convite=abc',
    '/f/f1.abc#convite=' + 'a'.repeat(101),
    '/f/f1.abc#convite=a\nb',
    '/f/f1.abc/' + 'a'.repeat(2048),
  ])('recusa origem, rota ou convite inseguro/ambíguo: %s', (value) => {
    expect(parsePartyInvite(value, origin)).toBeNull()
  })
})
