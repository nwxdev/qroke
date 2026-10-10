import { describe, expect, it } from 'vitest'
import { suggestionQuery, cleanSuggestions } from '../server/core/search-suggestions'
describe('sugestões musicais', () => {
  it('separa karaokê sem repetir seu prefixo e normaliza consultas', () => {
    expect(suggestionQuery('  Evidências ', false)).toBe('evidências')
    expect(suggestionQuery(' Evidências ', true)).toBe('karaoke evidências')
    expect(suggestionQuery('Karaokê Evidências', true)).toBe('karaokê evidências')
  })
  it('exibe o nome da música sem repetir o filtro de karaokê', () => {
    expect(cleanSuggestions(['karaoke evidências', 'Karaokê evidências'], 'evid', true)).toEqual([
      'evidências',
    ])
  })
  it('deduplica, remove controles, limita opções e não repete a consulta', () => {
    expect(
      cleanSuggestions(
        ['Ana', ' ana ', 'ANa Maria', 'Ana\u0000 Maria', '', 'Evidências'],
        'ana',
        false,
      ),
    ).toEqual(['ANa Maria', 'Evidências'])
    expect(
      cleanSuggestions(
        Array.from({ length: 30 }, (_, i) => 'Faixa ' + i),
        'fa',
        true,
      ),
    ).toHaveLength(8)
  })
})
